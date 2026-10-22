import { describe, expect, test } from 'bun:test';
import { strFromU8, unzipSync } from 'fflate';
import { Vector3 } from 'three';
import { buildParts, type ModelSettings, toMillimeters } from './model';
import { visibleRegions } from './regions';
import { indexedMesh, modelXml, toThreeMf } from './three-mf';

const regions = visibleRegions([
  {
    color: '#ff0000',
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
  trim: false,
  height: 1,
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

const parts = buildParts(toMillimeters(regions, 10).regions, settings);

/** The volume of a closed, indexed mesh (sum of signed tetrahedra) */
function volume({ vertices, triangles }: ReturnType<typeof indexedMesh>) {
  let sum = 0;
  for (const [a, b, c] of triangles) {
    const [va, vb, vc] = [a, b, c].map((index) => new Vector3(...vertices[index]!));
    sum += va!.dot(vb!.cross(vc!)) / 6;
  }
  return sum;
}

describe('indexedMesh', () => {
  test('shares the vertices between triangles', () => {
    const square = parts.find(({ name }) => name === 'ff0000')!;
    const mesh = indexedMesh(square.geometry);

    // A box has 8 corners and 12 triangles
    expect(mesh.vertices).toHaveLength(8);
    expect(mesh.triangles).toHaveLength(12);
    expect(mesh.triangles.flat().every((index) => index < mesh.vertices.length)).toBe(true);
  });

  test('keeps the faces pointing outwards', () => {
    const [base, square] = parts;

    expect(volume(indexedMesh(square!.geometry))).toBeCloseTo(100, 6);
    expect(volume(indexedMesh(base!.geometry))).toBeCloseTo(800, 6);
  });
});

describe('modelXml', () => {
  const xml = modelXml('logo', parts);

  test('writes one object per part, with its color as a material', () => {
    expect(xml).toContain('<base name="Base plate" displaycolor="#FFFFFF"/>');
    expect(xml).toContain('<base name="#ff0000" displaycolor="#FF0000"/>');
    expect(xml).toContain('<object id="2" name="Base plate" type="model" pid="1" pindex="0">');
    expect(xml).toContain('<object id="3" name="#ff0000" type="model" pid="1" pindex="1">');
  });

  test('combines the parts to one object, which is the only one built', () => {
    expect(xml).toContain('<object id="4" name="logo" type="model">');
    expect(xml).toContain('<component objectid="2"/>');
    expect(xml).toContain('<component objectid="3"/>');
    expect(xml.match(/<item /g)).toHaveLength(1);
    expect(xml).toContain('<item objectid="4"/>');
  });

  test('escapes names', () => {
    expect(modelXml('<a & "b">', [])).toContain(
      '<metadata name="Title">&lt;a &amp; &quot;b&quot;&gt;</metadata>',
    );
  });
});

describe('toThreeMf', () => {
  test('packs the model with the package files', () => {
    const files = unzipSync(toThreeMf('logo.svg', parts));

    expect(Object.keys(files).sort()).toEqual([
      '3D/3dmodel.model',
      '[Content_Types].xml',
      '_rels/.rels',
    ]);
    expect(strFromU8(files['3D/3dmodel.model']!)).toBe(modelXml('logo', parts));
    expect(strFromU8(files['_rels/.rels']!)).toContain('Target="/3D/3dmodel.model"');
  });
});
