import { describe, expect, test } from 'bun:test';
import { type Area, areaOf, offset, union } from './geometry';

const square = (x: number, y: number, size: number): Area => [
  [
    { x, y },
    { x: x + size, y },
    { x: x + size, y: y + size },
    { x, y: y + size },
  ],
];

describe('union', () => {
  test('merges overlapping offsets', () => {
    const grown = offset(square(10, 0, 10), 1);

    expect(areaOf(union(square(0, 0, 10), grown))).toBeCloseTo(100 + areaOf(grown) - 10, 6);
  });
});
