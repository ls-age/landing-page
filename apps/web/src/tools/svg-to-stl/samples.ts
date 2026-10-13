/** SVGs to try the tool with, in `public/tools/svg-to-stl` */
export const samples = [
  { name: 'Logo', file: 'logo.svg', description: 'Shapes on top of a background' },
  { name: 'Overlapping circles', file: 'overlapping-circles.svg', description: 'Three colors' },
  { name: 'Thin lines', file: 'thin-lines.svg', description: 'Lines thinner than one print line' },
] as const;

export type Sample = (typeof samples)[number];

export const sampleUrl = (sample: Sample) => `/tools/svg-to-stl/${sample.file}`;

/** Loads a sample as if it was chosen as a file */
export async function loadSample(sample: Sample) {
  const response = await fetch(sampleUrl(sample));
  if (!response.ok) throw new Error(`Could not load ${sample.file}`);
  return new File([await response.text()], sample.file, { type: 'image/svg+xml' });
}
