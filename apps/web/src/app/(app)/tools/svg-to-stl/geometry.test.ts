import { describe, expect, test } from 'bun:test';
import { type Area, areaOf, union } from './geometry';

const square = (x: number, y: number, size: number): Area => [
  [
    { x, y },
    { x: x + size, y },
    { x: x + size, y: y + size },
    { x, y: y + size },
  ],
];

describe('union', () => {
  test('merges overlapping areas with opposite orientations', () => {
    const reversed = square(5, 5, 10).map((path) => [...path].reverse());

    expect(areaOf(union(square(0, 0, 10), reversed))).toBe(175);
  });
});
