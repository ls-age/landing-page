import { ImageResponse } from 'next/og';
import { site } from '@/lib/site';

/** Renders the "LH" monogram used for the favicon and the Apple touch icon. */
export function monogram(size: number) {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: site.themeColor,
        color: 'white',
        fontSize: size * 0.45,
        fontWeight: 700,
        letterSpacing: -size * 0.02,
      }}
    >
      LH
    </div>,
    { width: size, height: size },
  );
}
