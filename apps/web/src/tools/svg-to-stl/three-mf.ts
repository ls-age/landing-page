import { strToU8, zipSync } from 'fflate';
import type { BufferGeometry } from 'three';
import { type Part, partLabel } from './model';

/**
 * Writes the parts as one 3MF file: a ZIP with an XML model (see
 * https://3mf.io/spec/), which three.js has no exporter for.
 *
 * Unlike STL, one 3MF holds all parts (as components of one object, in one coordinate system)
 * and their colors (as materials). Slicers load the parts as separate objects or, when asked, as
 * one object with multiple parts; PrusaSlicer ignores the colors.
 */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>
`;

const RELATIONSHIPS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
`;

const escape = (text: string) =>
  text.replaceAll(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] ?? char,
  );

/** Rounds to 1/100 µm, which also drops `-0` and exponents from the output */
const round = (value: number) => Number(value.toFixed(5));

/**
 * The mesh as 3MF needs it: each vertex once, and triangles as indices into them. Keeps the
 * triangles' order and orientation, so the faces still point outwards.
 */
export function indexedMesh(geometry: BufferGeometry) {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const count = index ? index.count : position.count;

  const vertices: [number, number, number][] = [];
  const indices = new Map<string, number>();
  const triangles: [number, number, number][] = [];

  const vertexAt = (at: number) => {
    const vertex: [number, number, number] = [
      round(position.getX(at)),
      round(position.getY(at)),
      round(position.getZ(at)),
    ];
    const key = vertex.join(',');
    let found = indices.get(key);
    if (found === undefined) {
      found = vertices.length;
      indices.set(key, found);
      vertices.push(vertex);
    }
    return found;
  };

  for (let at = 0; at + 2 < count; at += 3) {
    const triangle = [0, 1, 2].map((corner) =>
      vertexAt(index ? index.getX(at + corner) : at + corner),
    ) as [number, number, number];
    const [a, b, c] = triangle;
    // Rounding can collapse tiny triangles
    if (a !== b && b !== c && a !== c) triangles.push(triangle);
  }

  return { vertices, triangles };
}

/** `#RRGGBB`, as 3MF's `displaycolor` wants it */
const displayColor = (color: string) => color.toUpperCase();

function meshXml(geometry: BufferGeometry) {
  const { vertices, triangles } = indexedMesh(geometry);
  return [
    '      <mesh>',
    '        <vertices>',
    ...vertices.map(([x, y, z]) => `          <vertex x="${x}" y="${y}" z="${z}"/>`),
    '        </vertices>',
    '        <triangles>',
    ...triangles.map(([a, b, c]) => `          <triangle v1="${a}" v2="${b}" v3="${c}"/>`),
    '        </triangles>',
    '      </mesh>',
  ].join('\n');
}

/** The model XML: One mesh object per part, combined to one object with the parts as components */
export function modelXml(title: string, parts: Part[]) {
  const materialsId = 1;
  const meshIds = parts.map((_, index) => materialsId + 1 + index);
  const modelId = materialsId + 1 + parts.length;

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">',
    `  <metadata name="Title">${escape(title)}</metadata>`,
    '  <resources>',
    `    <basematerials id="${materialsId}">`,
    ...parts.map(
      (part) =>
        `      <base name="${escape(partLabel(part))}" displaycolor="${displayColor(part.color)}"/>`,
    ),
    '    </basematerials>',
    ...parts.map((part, index) =>
      [
        `    <object id="${meshIds[index]}" name="${escape(partLabel(part))}" type="model" pid="${materialsId}" pindex="${index}">`,
        meshXml(part.geometry),
        '    </object>',
      ].join('\n'),
    ),
    `    <object id="${modelId}" name="${escape(title)}" type="model">`,
    '      <components>',
    ...meshIds.map((id) => `        <component objectid="${id}"/>`),
    '      </components>',
    '    </object>',
    '  </resources>',
    '  <build>',
    `    <item objectid="${modelId}"/>`,
    '  </build>',
    '</model>',
    '',
  ].join('\n');
}

export const threeMfFileName = (svgName: string) => `${svgName.replace(/\.svg$/i, '')}.3mf`;

/** The parts as one `.3mf` file, named after the SVG */
export function toThreeMf(svgName: string, parts: Part[]) {
  return zipSync({
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(RELATIONSHIPS),
    '3D/3dmodel.model': strToU8(modelXml(svgName.replace(/\.svg$/i, ''), parts)),
  });
}
