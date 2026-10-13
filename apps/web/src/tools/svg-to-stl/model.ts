import type { PathD } from 'clipper2-ts';
import { zipSync } from 'fflate';
import { type BufferGeometry, ExtrudeGeometry, Mesh, Path, Shape, Vector2 } from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  type Area,
  bounds as boundsOf,
  difference,
  type Frame,
  polygons,
  toFrame,
  union,
} from './geometry';
import type { ColorRegion } from './regions';
import { removeUnprintable, thickenThinAreas } from './thin-areas';

export interface ColorSettings {
  enabled: boolean;
  /** mm, the shared height (`ModelSettings.height`) if not set */
  height?: number;
}

export type BaseKind = 'none' | 'outline' | 'rectangle';

export type BasePlacement = 'cutout' | 'below';

export interface ModelSettings {
  /** The width of the model's frame, in mm */
  width: number;
  /** Frame the model by the selected colors instead of the SVG's canvas */
  trim: boolean;
  /** The height of the colors that don't have their own, in mm */
  height: number;
  colors: Record<string, ColorSettings>;
  base: BaseKind;
  /** The thickness of the base plate in mm, the shared height (`height`) if not set */
  baseHeight?: number;
  /** The margin around a rectangular base (the model's frame), in mm */
  baseMargin: number;
  /**
   * Where a rectangular base goes: level with the colors, with the content cut out of it (an
   * inlay), or below them
   */
  basePlacement: BasePlacement;
  baseColor: string;
  /** The width of one printed line, in mm */
  lineWidth: number;
  /** Merge details slicers would drop into the neighboring colors */
  removeUnprintable: boolean;
  /** Widen areas thinner than one line */
  thicken: boolean;
}

export interface Part {
  name: string;
  color: string;
  geometry: BufferGeometry;
}

export const defaultColorSettings: ColorSettings = { enabled: true };

export function bounds(regions: ColorRegion[]): Frame {
  const { left, top, right, bottom } = boundsOf(regions.map(({ shape }) => shape));
  return toFrame(left, top, right, bottom);
}

function toPath<T extends Path>(path: T, points: PathD) {
  path.setFromPoints(points.map(({ x, y }) => new Vector2(x, y)));
  return path;
}

/** three.js shapes (with holes) for an area */
export const toShapes = (shape: Area) =>
  polygons(shape).map(({ outer, holes }) => {
    const result = toPath(new Shape(), outer);
    result.holes = holes.map((hole) => toPath(new Path(), hole));
    return result;
  });

/** Extrudes `shape` (in mm) from `z` to `z + depth` */
function extrude(shape: Area, z: number, depth: number) {
  const geometry = new ExtrudeGeometry(toShapes(shape), {
    depth,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geometry.translate(0, 0, z);
  return geometry;
}

/**
 * Scales the regions so `frame` is `width` mm wide, with its bottom left corner at the origin.
 * Returns the regions and the frame in mm.
 */
export function toMillimeters(regions: ColorRegion[], width: number, frame = bounds(regions)) {
  const scale = frame.width > 0 ? width / frame.width : 1;

  return {
    regions: regions.map((region) => ({
      ...region,
      // SVG coordinates grow downwards
      shape: region.shape.map((path) =>
        path.map(({ x, y }) => ({ x: (x - frame.minX) * scale, y: (frame.maxY - y) * scale })),
      ),
      area: region.area * scale ** 2,
    })),
    frame: toFrame(0, 0, frame.width * scale, frame.height * scale),
  };
}

/** The enabled colors (in mm), adjusted for printing */
export function printedRegions(
  regions: ColorRegion[],
  settings: Pick<ModelSettings, 'colors' | 'lineWidth' | 'removeUnprintable' | 'thicken'>,
) {
  let result = regions.filter(
    ({ color }) => (settings.colors[color] ?? defaultColorSettings).enabled,
  );
  if (settings.removeUnprintable) result = removeUnprintable(result, settings.lineWidth);
  if (settings.thicken) result = thickenThinAreas(result, settings.lineWidth);

  return result;
}

const heightOf = (settings: Pick<ModelSettings, 'colors' | 'height'>, color: string) =>
  settings.colors[color]?.height ?? settings.height;

const isCutout = (settings: Pick<ModelSettings, 'base' | 'basePlacement'>) =>
  settings.base === 'rectangle' && settings.basePlacement === 'cutout';

/**
 * The height of a color's top face: Colors stand on the base plate (at 0), or are sunk into it
 * (with their tops at 0) if it's cut out
 */
export const colorTop = (
  settings: Pick<ModelSettings, 'colors' | 'height' | 'base' | 'basePlacement'>,
  color: string,
) => (isCutout(settings) ? 0 : heightOf(settings, color));

/**
 * A plate from `-thickness` to 0 with pockets in its top for the colors, each as deep as the
 * color is high: Where the plate is thicker than a color, it's closed behind it. Built from
 * slabs between the pocket depths.
 */
function pocketedPlate(plate: Area, pockets: { shape: Area; depth: number }[], thickness: number) {
  const depths = [
    ...new Set([0, thickness, ...pockets.map(({ depth }) => Math.min(depth, thickness))]),
  ].sort((a, b) => a - b);

  const slabs: BufferGeometry[] = [];
  for (let index = 0; index + 1 < depths.length; index++) {
    const [top, bottom] = [depths[index]!, depths[index + 1]!];
    const holes = union(
      ...pockets.filter(({ depth }) => depth >= bottom).map(({ shape }) => shape),
    );
    const slab = difference(plate, holes);
    if (slab.length > 0) slabs.push(extrude(slab, -bottom, bottom - top));
  }

  // Nothing is left if the colors cover the whole plate
  if (slabs.length === 0) return;

  const geometry = mergeGeometries(slabs);
  for (const slab of slabs) slab.dispose();
  return geometry;
}

/**
 * One solid per region (in mm) and the base, which fills `frame` if it's rectangular. All parts
 * share one coordinate system, so slicers line them up when they're loaded as parts of one object.
 */
export function buildParts(
  regions: ColorRegion[],
  settings: ModelSettings,
  frame = bounds(regions),
): Part[] {
  const cutout = isCutout(settings);
  const parts: Part[] = regions.map(({ color, shape }) => {
    const height = heightOf(settings, color);
    return {
      name: color.slice(1),
      color,
      geometry: extrude(shape, cutout ? -height : 0, height),
    };
  });

  const thickness = settings.baseHeight ?? settings.height;
  if (settings.base !== 'none' && regions.length > 0 && thickness > 0) {
    let geometry: BufferGeometry | undefined;
    if (settings.base === 'rectangle') {
      const margin = settings.baseMargin;
      const plate: Area = [
        [
          { x: frame.minX - margin, y: frame.minY - margin },
          { x: frame.maxX + margin, y: frame.minY - margin },
          { x: frame.maxX + margin, y: frame.maxY + margin },
          { x: frame.minX - margin, y: frame.maxY + margin },
        ],
      ];
      geometry = cutout
        ? pocketedPlate(
            plate,
            regions.map(({ color, shape }) => ({ shape, depth: heightOf(settings, color) })),
            thickness,
          )
        : extrude(plate, -thickness, thickness);
    } else {
      geometry = extrude(union(...regions.map(({ shape }) => shape)), -thickness, thickness);
    }
    if (geometry) parts.unshift({ name: 'base', color: settings.baseColor, geometry });
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
