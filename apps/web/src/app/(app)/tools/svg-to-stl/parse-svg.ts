import polygonClipping, { type MultiPolygon, type Polygon, type Ring } from 'polygon-clipping';
import { Color, type ShapePath, type Vector2 } from 'three';
import { type StrokeStyle, SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import type { Layer } from './regions';

/** Points per curve segment */
const CURVE_DIVISIONS = 12;

/** The style `SVGLoader` resolves for each path (`path.userData.style`) */
interface PathStyle extends StrokeStyle {
  fill?: string;
  fillOpacity: number;
  stroke?: string;
  strokeOpacity: number;
  opacity: number;
  visibility?: string;
}

const pathStyle = (path: ShapePath) => path.userData.style as PathStyle | undefined;

const toRing = (points: Vector2[]): Ring => points.map(({ x, y }) => [x, y]);

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

function fillShape(path: ShapePath): MultiPolygon {
  const polygons = path
    .toShapes()
    .map((shape) => shape.extractPoints(CURVE_DIVISIONS))
    .map(({ shape, holes }): Polygon => [toRing(shape), ...holes.map((hole) => toRing(hole))])
    .filter(([outer]) => outer && outer.length >= 3);

  // Resolves self-intersections and overlapping subpaths
  return polygons.length > 0 ? polygonClipping.union(polygons[0]!, ...polygons.slice(1)) : [];
}

function strokeShape(path: ShapePath, style: PathStyle): MultiPolygon {
  const triangles: Polygon[] = [];

  for (const subPath of path.subPaths) {
    const geometry = SVGLoader.pointsToStroke(
      subPath.getPoints(CURVE_DIVISIONS),
      style,
    ) as ReturnType<typeof SVGLoader.pointsToStroke> | null;
    if (!geometry) continue;

    const position = geometry.getAttribute('position');
    for (let index = 0; index + 2 < position.count; index += 3) {
      const [ax, ay, bx, by, cx, cy] = [index, index + 1, index + 2].flatMap((index) => [
        position.getX(index),
        position.getY(index),
      ]) as [number, number, number, number, number, number];
      // Skip degenerate triangles, they break the boolean operations
      if (Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) > 1e-9) {
        triangles.push([
          [
            [ax, ay],
            [bx, by],
            [cx, cy],
          ],
        ]);
      }
    }
    geometry.dispose();
  }

  return triangles.length > 0 ? polygonClipping.union(triangles[0]!, ...triangles.slice(1)) : [];
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
      if (fill) layers.push({ color: fill, shape: fillShape(path) });
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
