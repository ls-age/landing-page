'use client';

import type { ComponentProps, ReactNode } from 'react';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import './image-zoom.css';

/**
 * Zooms an image to fill the screen on click, like Fumadocs' `ImageZoom` (both built on
 * react-medium-image-zoom). `zoomImg` is the image to show zoomed in, usually a larger one.
 */
export function ImageZoom({
  zoomImg,
  children,
}: {
  zoomImg: ComponentProps<'img'>;
  children: ReactNode;
}) {
  return (
    <Zoom zoomImg={zoomImg} zoomMargin={16} wrapElement="div">
      {children}
    </Zoom>
  );
}
