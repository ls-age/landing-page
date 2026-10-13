import { describe, expect, test } from 'bun:test';
import { type Area, areaOf, intersection, union } from './geometry';
import type { ColorRegion } from './regions';
import { findThinAreas, removeUnprintable, thickenThinAreas } from './thin-areas';

const rectangle = (x: number, y: number, width: number, height: number): Area => [
  [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ],
];

const region = (color: string, shape: Area): ColorRegion => ({
  color,
  shape,
  area: areaOf(shape),
});

const lineWidth = 0.45;

describe('findThinAreas', () => {
  test('finds parts narrower than one line, but not corners', () => {
    // A 10 mm square with a 0.3 mm wide, 10 mm long strip attached
    const thin = findThinAreas(
      [region('#000000', union(rectangle(0, 0, 10, 10), rectangle(10, 5, 10, 0.3)))],
      lineWidth,
    );

    expect(thin).toHaveLength(1);
    expect(thin[0]!.area).toBeCloseTo(3, 1);
  });

  test('finds nothing in wide areas', () => {
    expect(findThinAreas([region('#000000', rectangle(0, 0, 10, 1))], lineWidth)).toEqual([]);
  });
});

describe('removeUnprintable', () => {
  test('merges details slicers drop into the neighboring color', () => {
    const regions = [
      // A 0.05 mm wide sliver along the top of the yellow square
      region('#000000', union(rectangle(0, 10, 10, 0.05), rectangle(20, 0, 5, 5))),
      region('#ffff00', rectangle(0, 0, 10, 10)),
    ];
    const [black, yellow] = removeUnprintable(regions, lineWidth);

    expect(black?.area).toBeCloseTo(25, 5);
    expect(yellow?.area).toBeCloseTo(100.5, 5);
  });
});

describe('thickenThinAreas', () => {
  test('widens thin areas at the expense of the neighbors', () => {
    const [yellow, black] = thickenThinAreas(
      [
        region('#ffff00', union(rectangle(0, 0, 10, 4.9), rectangle(0, 5.1, 10, 4.9))),
        // A 0.2 mm wide line across the yellow square
        region('#000000', rectangle(0, 4.9, 10, 0.2)),
      ],
      lineWidth,
    );

    expect(findThinAreas([black!], lineWidth)).toEqual([]);
    expect(areaOf(intersection(yellow!.shape, black!.shape))).toBeCloseTo(0, 6);
    expect(yellow!.area).toBeLessThan(98);
  });
});
