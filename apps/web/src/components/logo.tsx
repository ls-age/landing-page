import type { ComponentProps } from 'react';

/** The "lh_" icon in its full form (with the underscore); use it at 48px or larger. */
export function Logo(props: ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" {...props}>
      <rect width="200" height="200" rx="44" fill="#c70036" />
      <g transform="translate(26.5 62.5)">
        <g fill="#fff">
          <path d="M15 10H25V49A6 6 0 0 0 31 55H43V65H31A16 16 0 0 1 15 49Z" />
          <path d="M51 10H61V65H51Z" />
          <path d="M51 65V40A17 17 0 0 1 68 23H69A17 17 0 0 1 86 40V65H76V40A7 7 0 0 0 69 33H68A7 7 0 0 0 61 40V65Z" />
        </g>
        <path fill="#1c1314" d="M96 67H132V77H96Z" />
      </g>
    </svg>
  );
}
