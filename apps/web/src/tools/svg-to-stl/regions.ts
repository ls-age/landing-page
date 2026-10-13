import { type Area, areaOf, difference, union } from './geometry';

/** A filled (or stroked) area of an SVG, in painting order */
export interface Layer {
  /** `#rrggbb` */
  color: string;
  shape: Area;
}

/** The area of one color that is visible in the rendered SVG */
export interface ColorRegion {
  color: string;
  shape: Area;
  area: number;
}

/**
 * The visible area of each color: Goes through the layers from top to bottom and cuts away what
 * the layers above cover, the way the SVG renders. Tools that extrude each path as is (like
 * svg2solid) produce overlapping solids instead, which slicers can't print.
 *
 * Returns the colors in the order they first appear in the SVG (bottom first).
 */
export function visibleRegions(layers: Layer[]): ColorRegion[] {
  let covered: Area = [];
  const byColor = new Map<string, { first: number; shape: Area }>();

  for (let index = layers.length - 1; index >= 0; index--) {
    const { color, shape } = layers[index]!;
    if (shape.length === 0) continue;

    const visible = difference(shape, covered);
    covered = union(covered, shape);

    const region = byColor.get(color);
    if (region) {
      region.first = index;
      region.shape = union(region.shape, visible);
    } else {
      byColor.set(color, { first: index, shape: visible });
    }
  }

  return [...byColor]
    .sort(([, a], [, b]) => a.first - b.first)
    .map(([color, { shape }]) => ({ color, shape, area: areaOf(shape) }))
    .filter((region) => region.area > 0);
}
