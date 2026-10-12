import polygonClipping, { type MultiPolygon, type Ring } from 'polygon-clipping';

/** A filled (or stroked) area of an SVG, in painting order */
export interface Layer {
  /** `#rrggbb` */
  color: string;
  shape: MultiPolygon;
}

/** The area of one color that is visible in the rendered SVG */
export interface ColorRegion {
  color: string;
  shape: MultiPolygon;
  area: number;
}

const ringArea = (ring: Ring) => {
  let area = 0;
  for (let index = 0; index < ring.length; index++) {
    const [x1, y1] = ring[index]!;
    const [x2, y2] = ring[(index + 1) % ring.length]!;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
};

export const multiPolygonArea = (shape: MultiPolygon) =>
  shape.reduce(
    (sum, [outer, ...holes]) =>
      sum + (outer ? ringArea(outer) : 0) - holes.reduce((h, ring) => h + ringArea(ring), 0),
    0,
  );

/**
 * The visible area of each color: Goes through the layers from top to bottom and cuts away what
 * the layers above cover, the way the SVG renders. Tools that extrude each path as is (like
 * svg2solid) produce overlapping solids instead, which slicers can't print.
 *
 * Returns the colors in the order they first appear in the SVG (bottom first).
 */
export function visibleRegions(layers: Layer[]): ColorRegion[] {
  let covered: MultiPolygon = [];
  const byColor = new Map<string, { first: number; shape: MultiPolygon }>();

  for (let index = layers.length - 1; index >= 0; index--) {
    const { color, shape } = layers[index]!;
    if (shape.length === 0) continue;

    const visible = covered.length > 0 ? polygonClipping.difference(shape, covered) : shape;
    covered = covered.length > 0 ? polygonClipping.union(covered, shape) : shape;

    const region = byColor.get(color);
    if (region) {
      region.first = index;
      if (visible.length > 0) {
        region.shape =
          region.shape.length > 0 ? polygonClipping.union(region.shape, visible) : visible;
      }
    } else {
      byColor.set(color, { first: index, shape: visible });
    }
  }

  return [...byColor]
    .sort(([, a], [, b]) => a.first - b.first)
    .map(([color, { shape }]) => ({ color, shape, area: multiPolygonArea(shape) }))
    .filter((region) => region.area > 0);
}
