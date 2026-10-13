import { describe, expect, test } from 'bun:test';
import { Box3 } from 'three';
import { buildParts, type ModelSettings } from './model';
import { visibleRegions } from './regions';

const regions = visibleRegions([
  {
    color: '#000000',
    shape: [
      [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
        ],
      ],
    ],
  },
]);

const settings: ModelSettings = {
  width: 10,
  colors: {},
  base: 'rectangle',
  baseHeight: 2,
  baseMargin: 5,
  baseCutout: false,
  baseColor: '#ffffff',
};

const baseOf = (changes: Partial<ModelSettings>) => {
  const base = buildParts(regions, { ...settings, ...changes }).find(({ name }) => name === 'base');
  base?.geometry.computeBoundingBox();
  return base?.geometry.boundingBox ?? new Box3();
};

describe('buildParts', () => {
  test('puts the base plate below the colors', () => {
    const box = baseOf({});

    expect([box.min.toArray(), box.max.toArray()]).toEqual([
      [-5, -5, -2],
      [15, 15, 0],
    ]);
  });

  test('puts a base plate with the content cut out level with the colors', () => {
    const box = baseOf({ baseCutout: true });

    expect([box.min.z, box.max.z]).toEqual([0, 2]);
  });

  test('ignores the cutout for outline base plates', () => {
    const box = baseOf({ base: 'outline', baseCutout: true });

    expect([box.min.z, box.max.z]).toEqual([-2, 0]);
  });
});
