import {
  type Area,
  areaOf,
  difference,
  intersection,
  offset,
  pieces,
  simplify,
  union,
} from './geometry';
import type { ColorRegion } from './regions';

/** PrusaSlicer's default extrusion width for a 0.4 mm nozzle, in mm */
export const defaultLineWidth = 0.45;

/**
 * Slicers drop details thinner than this share of the line width (Arachne's minimum feature size
 * is 25% of the nozzle diameter)
 */
const unprintableShare = 0.25;

export const unprintableWidth = (lineWidth: number) => lineWidth * unprintableShare;

/**
 * The parts of `area` that are narrower than `width`: where a circle of that diameter doesn't fit
 * (the area minus its morphological opening). Ignores the small residue at convex corners, which
 * the opening rounds off at any size.
 */
function thinParts(area: Area, width: number): Area[] {
  const radius = width / 2;
  const opened = offset(offset(area, -radius), radius);

  return pieces(difference(area, opened)).filter((piece) => areaOf(piece) >= 0.25 * width ** 2);
}

export interface ThinArea {
  color: string;
  shape: Area;
  area: number;
  /** The thin share of the color's area */
  share: number;
}

/** The areas of each color that are narrower than one printed line (all in mm) */
export function findThinAreas(regions: ColorRegion[], lineWidth: number): ThinArea[] {
  return regions
    .map(({ color, shape, area }) => {
      const thin = union(...thinParts(shape, lineWidth));
      const thinArea = areaOf(thin);
      return { color, shape: thin, area: thinArea, share: area > 0 ? thinArea / area : 0 };
    })
    .filter(({ area }) => area > 0);
}

const withArea = (region: ColorRegion): ColorRegion => ({ ...region, area: areaOf(region.shape) });

/**
 * Merges the details slicers would drop into the neighboring color they share the longest edge
 * with, so they don't leave gaps. Details without neighbors are removed.
 */
export function removeUnprintable(regions: ColorRegion[], lineWidth: number): ColorRegion[] {
  const result = regions.map((region) => ({ ...region }));
  const width = unprintableWidth(lineWidth);

  for (const region of result) {
    for (const detail of thinParts(region.shape, width)) {
      // Measure the shared edges by how much of the neighbors a slightly grown detail covers
      const grown = offset(detail, width);
      let neighbor: ColorRegion | undefined;
      let shared = 0;
      for (const other of result) {
        if (other === region) continue;
        const overlap = areaOf(intersection(grown, other.shape));
        if (overlap > shared) [neighbor, shared] = [other, overlap];
      }

      region.shape = difference(region.shape, detail);
      if (neighbor) neighbor.shape = union(neighbor.shape, detail);
    }
  }

  return result.map((region) => withArea(region)).filter(({ area }) => area > 0);
}

/** The steps (per side) thin areas grow by when thickening, as a share of the line width */
const thickenStep = 1 / 16;

/**
 * The area grown to one line where it's narrower than `lineWidth`: Grows the outline in small
 * steps, only next to the parts that are still too thin. So each spot grows only as much as it
 * needs, and the outline stays smooth.
 */
function thickened(area: Area, lineWidth: number): Area {
  const thin = union(...thinParts(area, lineWidth));
  if (thin.length === 0) return [];

  // Only works on the surroundings of the thin parts, which is much faster for large areas
  const surroundings = offset(thin, lineWidth);
  const original = intersection(area, offset(thin, 2 * lineWidth));
  const step = lineWidth * thickenStep;
  let result = original;
  let stillThin = thin;
  // Zero-width parts need to grow by half a line on each side
  for (let index = 0; index < 0.5 / thickenStep + 1 && stillThin.length > 0; index++) {
    result = union(result, intersection(offset(result, step), offset(stillThin, step)));
    // Each step adds round corners, which would add up to a lot of vertices
    result = simplify(result, lineWidth / 100);
    stillThin = intersection(union(...thinParts(result, lineWidth)), surroundings);
  }

  return difference(result, original);
}

/**
 * Widens the thin areas of each color to one line. The neighboring colors give up the space;
 * colors with more thin area go first and keep all of their area.
 */
export function thickenThinAreas(regions: ColorRegion[], lineWidth: number): ColorRegion[] {
  const result = regions.map((region) => ({ ...region }));
  const order = result
    .map((region) => ({ region, growth: thickened(region.shape, lineWidth) }))
    .filter(({ growth }) => growth.length > 0)
    .sort((a, b) => areaOf(b.growth) - areaOf(a.growth));

  let kept: Area = [];
  for (const { region, growth: wanted } of order) {
    const growth = difference(wanted, kept);
    region.shape = union(region.shape, growth);
    for (const other of result) {
      if (other !== region) other.shape = difference(other.shape, growth);
    }
    kept = union(kept, region.shape);
  }

  return result.map((region) => withArea(region)).filter(({ area }) => area > 0);
}
