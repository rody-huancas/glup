import type { ImageMetadata } from 'astro';

// The widths a picture is offered at, for screens of 1x, 2x and 3x: never wider than the picture itself
// (the largest it can be is its own size), without repeats.
export const densityWidths = (shown: number, intrinsic: number): number[] => {
  const widths = [1, 2, 3].map((density) => Math.min(intrinsic, Math.round(shown * density)));

  return [...new Set(widths)];
};

export interface ISharpImageParams {
  picture : ImageMetadata;
  shown   : number;
  eager?  : boolean;
}

// What <Image> needs to show a picture sharp at `shown` CSS pixels on any screen: 1x, 2x and 3x widths
// and WebP, lossless here (astro.config.ts): the soft shading of Glup's renders stays clean.
// Decorative: no alt text.
export const sharpImage = ({ picture, shown, eager = false }: ISharpImageParams) => ({
  src     : picture,
  widths  : densityWidths(Math.round(shown), picture.width),
  sizes   : `${Math.round(shown)}px`,
  format  : 'webp' as const,
  alt     : '',
  loading : eager ? ('eager' as const) : ('lazy' as const),
});
