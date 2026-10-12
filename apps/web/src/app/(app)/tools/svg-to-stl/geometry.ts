import {
  areaPathsD,
  booleanOpD,
  booleanOpDWithPolyTree,
  ClipType,
  EndType,
  FillRule,
  getBoundsPathsD,
  inflatePathsD,
  JoinType,
  type PathD,
  type PathsD,
  type PolyPathD,
  PolyTreeD,
} from 'clipper2-ts';

/**
 * A 2D area: closed paths (Clipper2's `PathsD`) filled with the nonzero rule, so outlines and
 * holes have opposite orientations
 */
export type Area = PathsD;

/** Decimal places Clipper2 rounds coordinates to */
const PRECISION = 6;

/** Normalizes `paths` (with `fillRule`) into an `Area` */
export const fill = (paths: PathsD, fillRule = FillRule.NonZero): Area =>
  booleanOpD(ClipType.Union, paths, null, fillRule, PRECISION); // eslint-disable-line unicorn/no-null

/**
 * Merges areas. Each one is filled separately: concatenating their paths would let overlapping
 * paths with opposite orientations cancel each other out.
 */
export function union(...areas: Area[]): Area {
  let result: Area = [];
  for (const area of areas) {
    result = booleanOpD(ClipType.Union, result, area, FillRule.NonZero, PRECISION);
  }
  return result;
}

export const difference = (area: Area, clip: Area): Area =>
  clip.length > 0 ? booleanOpD(ClipType.Difference, area, clip, FillRule.NonZero, PRECISION) : area;

/** Grows (`delta` > 0) or shrinks (`delta` < 0) an area, or turns open paths into strokes */
export const offset = (
  paths: PathsD,
  delta: number,
  { join = JoinType.Round, end = EndType.Polygon, miterLimit = 2 } = {},
): Area =>
  inflatePathsD(paths, delta, join, end, miterLimit, PRECISION, Math.abs(delta) / 50 || undefined);

export const areaOf = (area: Area) => Math.abs(areaPathsD(area));

export const bounds = (areas: Area[]) => getBoundsPathsD(areas.flat());

export interface Polygon {
  outer: PathD;
  holes: PathD[];
}

/** The separate polygons of an area, each with its holes */
export function polygons(area: Area): Polygon[] {
  const tree = new PolyTreeD();
  booleanOpDWithPolyTree(ClipType.Union, area, null, tree, FillRule.NonZero, PRECISION); // eslint-disable-line unicorn/no-null

  const result: Polygon[] = [];
  const collect = (parent: PolyPathD) => {
    for (let index = 0; index < parent.count; index++) {
      const outer = parent.child(index);
      const holes: PathD[] = [];
      for (let holeIndex = 0; holeIndex < outer.count; holeIndex++) {
        const hole = outer.child(holeIndex);
        if (hole.poly) holes.push(hole.poly);
        // Islands inside the hole
        collect(hole);
      }
      if (outer.poly) result.push({ outer: outer.poly, holes });
    }
  };
  collect(tree);

  return result;
}

/** The parts of `area` as separate areas */
export const pieces = (area: Area): Area[] =>
  polygons(area).map(({ outer, holes }) => [outer, ...holes]);

export { EndType, FillRule, JoinType } from 'clipper2-ts';
