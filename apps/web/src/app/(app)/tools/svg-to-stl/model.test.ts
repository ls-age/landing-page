import { describe, expect, test } from 'bun:test';
import { Box3 } from 'three';
import { buildParts, type ModelSettings, toMillimeters } from './model';
import { visibleRegions } from './regions';

const regions = visibleRegions([
  {
    color: '#000000',
    shape: [
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
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
  lineWidth: 0.45,
  removeUnprintable: false,
  thicken: false,
};

const baseOf = (changes: Partial<ModelSettings>) => {
  const base = buildParts(toMillimeters(regions, 10), { ...settings, ...changes }).find(
    ({ name }) => name === 'base',
  );
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
