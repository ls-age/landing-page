import type { PathD } from 'clipper2-ts';
import { Color, type ShapePath, type Vector2 } from 'three';
import { type StrokeStyle, SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { type Area, EndType, fill, FillRule, JoinType, offset, union } from './geometry';
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
  opacity: number;
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

/** The fills and strokes of an SVG, in painting order. Runs in the browser only (`DOMParser`). */
export function parseSvg(text: string) {
  const { paths } = new SVGLoader().parse(text);
  const layers: Layer[] = [];
  const warnings = new Set<string>();

  for (const path of paths) {
    const style = pathStyle(path);
    if (!style || style.visibility === 'hidden' || style.opacity === 0) continue;

    const fill = style.fillOpacity === 0 ? undefined : paintColor(style.fill, warnings);
    const stroke =
      style.strokeOpacity === 0 || !(style.strokeWidth > 0)
        ? undefined
        : paintColor(style.stroke, warnings);

    try {
      if (fill) layers.push({ color: fill, shape: fillShape(path, style) });
      if (stroke) layers.push({ color: stroke, shape: strokeShape(path, style) });
    } catch {
      warnings.add('Some shapes could not be converted and are missing.');
    }

    if (
      (fill && style.fillOpacity < 1) ||
      (stroke && style.strokeOpacity < 1) ||
      style.opacity < 1
    ) {
      warnings.add('Transparency is not supported, transparent areas are printed opaque.');
    }
  }

  return { layers, warnings: [...warnings] };
}
