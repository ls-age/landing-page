import { ImageResponse } from 'next/og';
import { site } from '@/lib/site';

export const ogImageSize = { width: 1200, height: 630 };

/** An Open Graph image with a title, in the site's colors */
export function ogImage({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: '#0a0a0a',
        color: 'white',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 32 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            borderRadius: 36,
            background: site.themeColor,
            fontSize: 30,
          }}
        >
          LH
        </div>
        {site.name}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {eyebrow && <div style={{ fontSize: 32, color: '#a3a3a3' }}>{eyebrow}</div>}
        <div style={{ fontSize: title.length > 60 ? 56 : 72, lineHeight: 1.15 }}>{title}</div>
      </div>
    </div>,
    ogImageSize,
  );
}
