import { ogImage } from '@/lib/og-image';
import { site } from '@/lib/site';

export const contentType = 'image/png';
export const alt = site.name;

export default function OpengraphImage() {
  return ogImage({ title: site.description });
}

export { ogImageSize as size } from '@/lib/og-image';
