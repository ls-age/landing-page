import type { PathD } from 'clipper2-ts';
import { Color, type ShapePath, type Vector2 } from 'three';
import { type StrokeStyle, SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import {
  type Area,
  difference,
  EndType,
  fill,
  FillRule,
  type Frame,
  intersection,
  JoinType,
  offset,
  toFrame,
  union,
} from './geometry';
import type { Layer } from './regions';

/** Points per curve segment */
const CURVE_DIVISIONS = 12;

/** The style `SVGLoader` resolves for each path (`path.userData.style`) */
interface PathStyle extends StrokeStyle {
  fill?: string;
  fillOpacity: number;
  fillRule?: string;
  stroke?: string;
  strokeOpacity: number;
  /** Only set if the SVG sets it */
  opacity?: number;
  visibility?: string;
}

const pathStyle = (path: ShapePath) => path.userData.style as PathStyle | undefined;

const toPath = (points: Vector2[]): PathD => points.map(({ x, y }) => ({ x, y }));

const joins: Record<string, JoinType> = { round: JoinType.Round, bevel: JoinType.Bevel };
const caps: Record<string, EndType> = { round: EndType.Round, square: EndType.Square };

/** `#rrggbb`, or `undefined` for paints that don't fill anything */
function paintColor(paint: string | undefined, warnings: Set<string>): string | undefined {
  if (!paint || paint === 'none' || paint === 'transparent') return;
  if (paint.startsWith('url')) {
    warnings.add('Gradients and patterns are not supported, these areas are skipped.');
    return;
  }
  // The text color, black unless the SVG is embedded in a page
  if (paint === 'currentColor') return '#000000';

  return `#${new Color().setStyle(paint).getHexString()}`;
}

function fillShape(path: ShapePath, style: PathStyle): Area {
  const paths = path.subPaths
    .map((subPath) => toPath(subPath.getPoints(CURVE_DIVISIONS)))
    .filter((points) => points.length >= 3);

  return fill(paths, style.fillRule === 'evenodd' ? FillRule.EvenOdd : FillRule.NonZero);
}

function strokeShape(path: ShapePath, style: PathStyle): Area {
  const closed: PathD[] = [];
  const open: PathD[] = [];
  for (const subPath of path.subPaths) {
    const points = toPath(subPath.getPoints(CURVE_DIVISIONS));
    const [first, last] = [points[0], points.at(-1)];
    // Shapes like `<rect>` end at their start instead of being closed explicitly
    if (subPath.autoClose || (first && last && first.x === last.x && first.y === last.y)) {
      // `getPoints` repeats the first point at the end of closed paths
      closed.push(points.slice(0, -1));
    } else {
      open.push(points);
    }
  }

  const options = {
    join: joins[style.strokeLineJoin] ?? JoinType.Miter,
    miterLimit: style.strokeMiterLimit,
  };
  const delta = style.strokeWidth / 2;

  return union(
    offset(closed, delta, { ...options, end: EndType.Joined }),
    offset(open, delta, { ...options, end: caps[style.strokeLineCap] ?? EndType.Butt }),
  );
}

/** Marks the content of a mask or clip path after `resolveMasks` (value: `mask:<n>`, `clip:<n>`) */
const MASK_CONTENT = 'data-svg-to-stl-mask';
/** Marks content that mask `<n>` applies to */
const MASKED = 'data-svg-to-stl-masked';

const XLINK = 'http://www.w3.org/1999/xlink';
const SVG = 'http://www.w3.org/2000/svg';

/** Inner `<use>` elements resolved per round; more rounds means a reference cycle */
const MAX_USE_DEPTH = 10;

/**
 * Replaces each `<use>` with a copy of the element it references. `SVGLoader` resolves `<use>`
 * itself, but parses the referenced element in place, so the masks of the `<use>`'s ancestors
 * would be lost.
 */
function inlineUses(svg: Element) {
  for (let round = 0; round < MAX_USE_DEPTH; round++) {
    const uses = [...svg.querySelectorAll('use')];
    if (uses.length === 0) return;

    for (const use of uses) {
      const href = use.getAttributeNS(XLINK, 'href') ?? use.getAttribute('href') ?? '';
      const target = href.startsWith('#')
        ? svg.querySelector(`#${CSS.escape(href.slice(1))}`)
        : undefined;
      if (!target || target.contains(use)) {
        use.remove();
        continue;
      }

      const group = svg.ownerDocument.createElementNS(SVG, 'g');
      for (const { name, value } of use.attributes) {
        if (!['href', 'xlink:href', 'x', 'y', 'width', 'height', 'transform'].includes(name)) {
          group.setAttribute(name, value);
        }
      }
      const x = Number.parseFloat(use.getAttribute('x') ?? '') || 0;
      const y = Number.parseFloat(use.getAttribute('y') ?? '') || 0;
      const transform = [use.getAttribute('transform'), (x || y) && `translate(${x},${y})`]
        .filter(Boolean)
        .join(' ');
      if (transform) group.setAttribute('transform', transform);

      const copy = target.cloneNode(true) as Element;
      copy.removeAttribute('id');
      group.append(copy);
      use.replaceWith(group);
    }
  }
  for (const use of svg.querySelectorAll('use')) use.remove();
}

/**
 * `SVGLoader` ignores `mask` and `clip-path`. This puts a copy of each mask's (or clip path's)
 * content next to the element it applies to, in the same coordinate system, and marks both, so
 * `parseSvg` can intersect them.
 */
function resolveMasks(svg: Element, warnings: Set<string>) {
  const document = svg.ownerDocument;
  let count = 0;

  for (const element of svg.querySelectorAll('[mask], [clip-path]')) {
    const attribute = element.hasAttribute('mask') ? 'mask' : 'clip-path';
    const id = /^url\(\s*["']?#([^"')]+)["']?\s*\)$/.exec(
      element.getAttribute(attribute)?.trim() ?? '',
    )?.[1];
    element.removeAttribute('mask');
    element.removeAttribute('clip-path');

    const source = id ? svg.querySelector(`#${CSS.escape(id)}`) : undefined;
    const kind = source?.localName === 'mask' ? 'mask' : source?.localName === 'clipPath' && 'clip';
    if (!source || !kind) continue;
    if (
      source.getAttribute('maskContentUnits') === 'objectBoundingBox' ||
      source.getAttribute('clipPathUnits') === 'objectBoundingBox'
    ) {
      warnings.add('Masks relative to the bounding box are not supported, they are ignored.');
      continue;
    }

    const index = String(count++);
    // The mask's coordinates include the transform of the element it applies to
    const wrapper = document.createElementNS(SVG, 'g');
    const transform = element.getAttribute('transform');
    if (transform) wrapper.setAttribute('transform', transform);
    element.removeAttribute('transform');

    const content = document.createElementNS(SVG, 'g');
    for (const { name, value } of source.attributes) {
      if (!['id', 'x', 'y', 'width', 'height', 'maskUnits', 'maskContentUnits'].includes(name)) {
        content.setAttribute(name, value);
      }
    }
    content.setAttribute(MASK_CONTENT, `${kind}:${index}`);
    for (const child of source.childNodes) content.append(child.cloneNode(true));

    const masked = document.createElementNS(SVG, 'g');
    masked.setAttribute(MASKED, index);

    element.replaceWith(wrapper);
    masked.append(element);
    wrapper.append(content, masked);
  }

  // `SVGLoader` would draw masks outside of `<defs>`
  for (const source of svg.querySelectorAll('mask, clipPath')) source.remove();
}

/** The mask (or clip path) a path belongs to, and the masks that apply to it */
function maskingOf(path: ShapePath) {
  const masks: string[] = [];
  let content: { kind: string; index: string } | undefined;

  for (
    let node = path.userData.node as Element | null;
    node && node.nodeType === 1;
    node = node.parentNode as Element | null
  ) {
    const masked = node.getAttribute(MASKED);
    if (masked) masks.push(masked);

    const [kind, index] = node.getAttribute(MASK_CONTENT)?.split(':') ?? [];
    if (kind && index && !content) content = { kind, index };
  }

  return { content, masks };
}

/** Whether a mask lets through what's below `color` (masks are luminance masks) */
function isOpaque(color: string, opacity: number) {
  const { r, g, b } = new Color(color);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) * opacity >= 0.5;
}

/** Applies a shape painted in a mask to the mask's area */
function paintMask(area: Area, shape: Area, color: string, opacity: number) {
  return isOpaque(color, opacity) ? union(area, shape) : difference(area, shape);
}

/** Prepares the SVG for `SVGLoader`, see `inlineUses` and `resolveMasks` */
function prepare(text: string, warnings: Set<string>) {
  const document = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = document.documentElement;
  if (svg.localName !== 'svg' || document.querySelector('parsererror')) return text;

  inlineUses(svg);
  resolveMasks(svg, warnings);

  return new XMLSerializer().serializeToString(document);
}

/**
 * The SVG's canvas in its own coordinates (which `SVGLoader` keeps): the `viewBox`, or the size
 * if it's given in pixels
 */
function canvasOf(svg: Element): Frame | undefined {
  const viewBox = svg
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (viewBox?.length === 4 && viewBox.every((value) => Number.isFinite(value))) {
    const [x, y, width, height] = viewBox as [number, number, number, number];
    if (width > 0 && height > 0) return toFrame(x, y, x + width, y + height);
  }

  const [width, height] = ['width', 'height'].map((name) => {
    const value = svg.getAttribute(name)?.trim() ?? '';
    return /^[\d.]+(px)?$/.test(value) ? Number.parseFloat(value) : Number.NaN;
  }) as [number, number];
  if (width > 0 && height > 0) return toFrame(0, 0, width, height);
}

/** The fills and strokes of an SVG, in painting order. Runs in the browser only (`DOMParser`). */
export function parseSvg(text: string) {
  const warnings = new Set<string>();
  const { paths, xml } = new SVGLoader().parse(prepare(text, warnings));
  const layers: Layer[] = [];
  const masks = new Map<string, Area>();

  for (const path of paths) {
    const style = pathStyle(path);
    if (!style || style.visibility === 'hidden' || style.opacity === 0) continue;

    const { content, masks: applied } = maskingOf(path);
    const fill = style.fillOpacity === 0 ? undefined : paintColor(style.fill, warnings);
    const stroke =
      style.strokeOpacity === 0 || !(style.strokeWidth > 0)
        ? undefined
        : paintColor(style.stroke, warnings);

    try {
      // Clip paths use the geometry of their shapes, regardless of the paint
      if (content?.kind === 'clip') {
        masks.set(content.index, union(masks.get(content.index) ?? [], fillShape(path, style)));
        continue;
      }

      const shapes: (Layer & { opacity: number })[] = [];
      if (fill)
        shapes.push({ color: fill, shape: fillShape(path, style), opacity: style.fillOpacity });
      if (stroke) {
        shapes.push({
          color: stroke,
          shape: strokeShape(path, style),
          opacity: style.strokeOpacity,
        });
      }

      if (content) {
        let area = masks.get(content.index) ?? [];
        for (const { color, shape, opacity } of shapes) {
          area = paintMask(area, shape, color, opacity * (style.opacity ?? 1));
        }
        masks.set(content.index, area);
        continue;
      }

      for (const { color, shape } of shapes) {
        let visible = shape;
        for (const index of applied) visible = intersection(visible, masks.get(index) ?? []);
        layers.push({ color, shape: visible });
      }
    } catch {
      warnings.add('Some shapes could not be converted and are missing.');
    }

    if (
      (fill && style.fillOpacity < 1) ||
      (stroke && style.strokeOpacity < 1) ||
      (style.opacity ?? 1) < 1
    ) {
      warnings.add('Transparency is not supported, transparent areas are printed opaque.');
    }
  }

  // `xml` is the root element, not the document its type says
  const canvas = canvasOf(xml as unknown as Element);

  return { layers, canvas, warnings: [...warnings] };
}
