import { describe, expect, test } from 'bun:test';
import { Box3, type BufferGeometry, Vector3 } from 'three';
import { toFrame } from './geometry';
import { bounds, buildParts, type ModelSettings, toMillimeters } from './model';
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

/** The volume of a closed mesh (sum of signed tetrahedra) */
function volume(geometry: BufferGeometry) {
  const position = geometry.getAttribute('position');
  const [a, b, c] = [new Vector3(), new Vector3(), new Vector3()];
  let sum = 0;
  for (let index = 0; index < position.count; index += 3) {
    a.fromBufferAttribute(position, index);
    b.fromBufferAttribute(position, index + 1);
    c.fromBufferAttribute(position, index + 2);
    sum += a.dot(b.cross(c)) / 6;
  }
  return sum;
}

const settings: ModelSettings = {
  width: 10,
  trim: false,
  colors: {},
  base: 'rectangle',
  baseHeight: 2,
  baseMargin: 5,
  basePlacement: 'below',
  baseColor: '#ffffff',
  lineWidth: 0.45,
  removeUnprintable: false,
  thicken: false,
};

const baseOf = (changes: Partial<ModelSettings>) => {
  const base = buildParts(toMillimeters(regions, 10).regions, { ...settings, ...changes }).find(
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

  test('sinks the colors into a cut out base plate, which is closed behind them', () => {
    // A 2 mm plate around a 1 mm high color
    const [base, square] = buildParts(toMillimeters(regions, 10).regions, {
      ...settings,
      basePlacement: 'cutout',
    });
    base?.geometry.computeBoundingBox();
    square?.geometry.computeBoundingBox();
    expect([base?.geometry.boundingBox?.min.z, base?.geometry.boundingBox?.max.z]).toEqual([-2, 0]);
    expect([square?.geometry.boundingBox?.min.z, square?.geometry.boundingBox?.max.z]).toEqual([
      -1, 0,
    ]);
    // The 20 × 20 × 2 mm plate without the 10 × 10 × 1 mm pocket
    expect(volume(base!.geometry)).toBeCloseTo(700, 6);
  });

  test('leaves out a cut out base plate the colors cover completely', () => {
    const parts = buildParts(toMillimeters(regions, 10).regions, {
      ...settings,
      baseMargin: 0,
      baseHeight: 1,
      basePlacement: 'cutout',
    });

    expect(parts.map(({ name }) => name)).toEqual(['000000']);
  });

  test('ignores the cutout for outline base plates', () => {
    const box = baseOf({ base: 'outline', basePlacement: 'cutout' });

    expect([box.min.z, box.max.z]).toEqual([-2, 0]);
  });

  test('sizes a rectangular base plate to the frame', () => {
    // The square in the top left quarter of a 20 × 20 canvas, scaled to 40 mm
    const model = toMillimeters(regions, 40, toFrame(0, 0, 20, 20));
    const [base, square] = buildParts(
      model.regions,
      { ...settings, baseMargin: 0, basePlacement: 'cutout' },
      model.frame,
    );
    base?.geometry.computeBoundingBox();

    expect(model.frame).toEqual(toFrame(0, 0, 40, 40));
    expect(base?.geometry.boundingBox?.max.toArray()).toEqual([40, 40, 0]);
    expect(bounds(model.regions)).toEqual(toFrame(0, 20, 20, 40));
    expect(square?.name).toBe('000000');
  });
});
