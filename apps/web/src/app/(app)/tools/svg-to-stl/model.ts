import { zipSync } from 'fflate';
import polygonClipping, { type MultiPolygon, type Ring } from 'polygon-clipping';
import { type BufferGeometry, ExtrudeGeometry, Mesh, Path, Shape, Vector2 } from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import type { ColorRegion } from './regions';

export interface ColorSettings {
  enabled: boolean;
  /** mm */
  height: number;
}

export type BaseKind = 'none' | 'outline' | 'rectangle';

export interface ModelSettings {
  /** The width of the whole model, in mm */
  width: number;
  colors: Record<string, ColorSettings>;
  base: BaseKind;
  /** mm */
  baseHeight: number;
  /** The margin around a rectangular base, in mm */
  baseMargin: number;
  /**
   * Cut the content out of a rectangular base, which then sits level with the colors (an inlay)
   * instead of below them
   */
  baseCutout: boolean;
  baseColor: string;
}

export interface Part {
  name: string;
  color: string;
  geometry: BufferGeometry;
}

export const defaultColorSettings: ColorSettings = { enabled: true, height: 1 };

export function bounds(regions: ColorRegion[]) {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const { shape } of regions) {
    for (const [x, y] of shape.flat().flat()) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function toPath<T extends Path>(path: T, ring: Ring) {
  path.setFromPoints(ring.map(([x, y]) => new Vector2(x, y)));
  return path;
}

/** Extrudes `shape` (in mm) from `z` to `z + depth` */
function extrude(shape: MultiPolygon, z: number, depth: number) {
  const shapes = shape.map(([outer, ...holes]) => {
    const result = toPath(new Shape(), outer!);
    result.holes = holes.map((hole) => toPath(new Path(), hole));
    return result;
  });

  const geometry = new ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 1 });
  geometry.translate(0, 0, z);
  return geometry;
}

/**
 * One solid per enabled color (and the base), in mm. All parts share one coordinate system, so
 * slicers line them up when they're loaded as parts of one object.
 */
export function buildParts(regions: ColorRegion[], settings: ModelSettings): Part[] {
  const box = bounds(regions);
  const scale = box.width > 0 ? settings.width / box.width : 1;
  // SVG coordinates grow downwards
  const toMillimeters = (shape: MultiPolygon): MultiPolygon =>
    shape.map((polygon) =>
      polygon.map((ring) => ring.map(([x, y]) => [(x - box.minX) * scale, (box.maxY - y) * scale])),
    );

  const enabled = regions.filter(
    ({ color }) => (settings.colors[color] ?? defaultColorSettings).enabled,
  );
  const parts: Part[] = enabled.map(({ color, shape }) => ({
    name: color.slice(1),
    color,
    geometry: extrude(
      toMillimeters(shape),
      0,
      (settings.colors[color] ?? defaultColorSettings).height,
    ),
  }));

  if (settings.base !== 'none' && enabled.length > 0 && settings.baseHeight > 0) {
    const content = () => {
      const shapes = enabled.map(({ shape }) => toMillimeters(shape));
      return polygonClipping.union(shapes[0]!, ...shapes.slice(1));
    };
    const cutout = settings.base === 'rectangle' && settings.baseCutout;

    let baseShape: MultiPolygon;
    if (settings.base === 'outline') {
      baseShape = content();
    } else {
      const margin = settings.baseMargin;
      const [width, height] = [box.width * scale, box.height * scale];
      baseShape = [
        [
          [
            [-margin, -margin],
            [width + margin, -margin],
            [width + margin, height + margin],
            [-margin, height + margin],
          ],
        ],
      ];
      if (cutout) baseShape = polygonClipping.difference(baseShape, content());
    }
    parts.unshift({
      name: 'base',
      color: settings.baseColor,
      geometry: extrude(baseShape, cutout ? 0 : -settings.baseHeight, settings.baseHeight),
    });
  }

  return parts;
}

const exporter = new STLExporter();

export const toStl = (part: Part) =>
  new Uint8Array(exporter.parse(new Mesh(part.geometry), { binary: true }).buffer);

export const fileName = (svgName: string, part: Part) =>
  `${svgName.replace(/\.svg$/i, '')}-${part.name}.stl`;

export function toZip(svgName: string, parts: Part[]) {
  return zipSync(Object.fromEntries(parts.map((part) => [fileName(svgName, part), toStl(part)])));
}
