import { cn } from '@workspace/ui/lib/utils';
import Image from 'next/image';
import type { Media, Post } from '@/__generated__/payload-types';

type WithImages = Pick<Post, 'featuredImage' | 'featuredImageDark'>;

const withUrl = (image: WithImages['featuredImage']) =>
  typeof image === 'object' && image?.url ? (image as Media & { url: string }) : undefined;

/**
 * A post's featured image and its dark mode variant, if they're populated (`depth: 1`); `undefined`
 * without a featured image, which the dark variant needs
 */
export function featuredImagesOf(post: WithImages) {
  const light = withUrl(post.featuredImage);
  return light && { light, dark: withUrl(post.featuredImageDark) };
}

/**
 * A post's featured image, and its dark mode variant instead in dark mode. Renders nothing
 * without a featured image.
 */
export function FeaturedImage({
  post,
  className,
  sizes,
  important = false,
  decorative = false,
}: {
  post: WithImages;
  className?: string;
  sizes?: string;
  /** Loads it right away (above the fold) */
  important?: boolean;
  /** Without alt text, e.g. in a link that already names the post */
  decorative?: boolean;
}) {
  const images = featuredImagesOf(post);
  if (!images) return;
  const { light, dark } = images;

  // Only one of the two shows, but preloaded or eager images would both load: so with a dark
  // variant they only get a high fetch priority (see "Theme detection" in the `next/image` docs)
  const props = {
    sizes,
    ...(important && (dark ? { fetchPriority: 'high' as const } : { preload: true })),
  };

  return (
    <>
      <Image
        {...props}
        src={light.url}
        alt={decorative ? '' : light.alt}
        width={light.width ?? 1200}
        height={light.height ?? 630}
        className={cn(className, dark && 'dark:hidden')}
      />
      {dark && (
        <Image
          {...props}
          src={dark.url}
          alt={decorative ? '' : dark.alt}
          width={dark.width ?? 1200}
          height={dark.height ?? 630}
          className={cn(className, 'hidden dark:block')}
        />
      )}
    </>
  );
}
