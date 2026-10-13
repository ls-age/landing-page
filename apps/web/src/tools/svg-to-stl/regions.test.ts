import { describe, expect, test } from 'bun:test';
import { type Area, areaOf, pieces } from './geometry';
import { visibleRegions } from './regions';

const square = (x: number, y: number, size: number): Area => [
  [
    { x, y },
    { x: x + size, y },
    { x: x + size, y: y + size },
    { x, y: y + size },
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
    expect(pieces(background!.shape)).toHaveLength(1);
    expect(background?.shape).toHaveLength(2);
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

test('areaOf subtracts holes', () => {
  expect(areaOf([...square(0, 0, 10), ...square(2, 2, 2).map((path) => [...path].reverse())])).toBe(
    96,
  );
});
