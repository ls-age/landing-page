import { describe, expect, test } from 'bun:test';
import type { MultiPolygon } from 'polygon-clipping';
import { multiPolygonArea, visibleRegions } from './regions';

const square = (x: number, y: number, size: number): MultiPolygon => [
  [
    [
      [x, y],
      [x + size, y],
      [x + size, y + size],
      [x, y + size],
    ],
  ],
];

describe('visibleRegions', () => {
  test('cuts the area covered by later layers out of earlier ones', () => {
    const regions = visibleRegions([
      { color: '#ff0000', shape: square(0, 0, 10) },
      { color: '#0000ff', shape: square(5, 5, 10) },
    ]);

    expect(regions.map(({ color, area }) => [color, area])).toEqual([
      ['#ff0000', 75],
      ['#0000ff', 100],
    ]);
  });

  test('leaves a hole where a shape lies on top of another', () => {
    const [background, dot] = visibleRegions([
      { color: '#ffffff', shape: square(0, 0, 10) },
      { color: '#000000', shape: square(4, 4, 2) },
    ]);

    expect(background?.area).toBe(96);
    expect(background?.shape[0]).toHaveLength(2);
    expect(dot?.area).toBe(4);
  });

  test('merges the layers of one color', () => {
    const regions = visibleRegions([
      { color: '#ff0000', shape: square(0, 0, 10) },
      { color: '#00ff00', shape: square(0, 0, 4) },
      { color: '#ff0000', shape: square(2, 2, 4) },
    ]);

    expect(regions.map(({ color, area }) => [color, area])).toEqual([
      ['#ff0000', 88],
      ['#00ff00', 12],
    ]);
    expect(regions.reduce((sum, region) => sum + region.area, 0)).toBe(100);
  });

  test('drops colors that are covered completely', () => {
    const regions = visibleRegions([
      { color: '#ff0000', shape: square(2, 2, 2) },
      { color: '#0000ff', shape: square(0, 0, 10) },
    ]);

    expect(regions.map(({ color }) => color)).toEqual(['#0000ff']);
  });
});

test('multiPolygonArea subtracts holes', () => {
  const [[outer]] = square(0, 0, 10) as [[MultiPolygon[number][number]]];
  const [[hole]] = square(2, 2, 2) as [[MultiPolygon[number][number]]];

  expect(multiPolygonArea([[outer, hole]])).toBe(96);
});
