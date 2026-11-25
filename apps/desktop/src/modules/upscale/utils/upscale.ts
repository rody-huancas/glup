// The same limit as Rust (services/upscale/tiles.rs): a bigger result is too big to open or share.
export const MAX_OUTPUT_PIXELS = 40_000_000;

export const outputSize = ([width, height]: [number, number], scale: number): [number, number] => [width * scale, height * scale];

export const fitsLimit = (size: [number, number], scale: number): boolean => {
  const [width, height] = outputSize(size, scale);
  return width * height <= MAX_OUTPUT_PIXELS;
};

// How many of the photos would be too big at that scale (the ones whose size is unknown are not counted).
export const tooBigCount = (sizes: ([number, number] | null)[], scale: number): number => sizes.filter((size) => size !== null && !fitsLimit(size, scale)).length;
