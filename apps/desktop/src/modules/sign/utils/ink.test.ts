import { describe, expect, it } from 'vitest';
import type { PixelImage } from '@/modules/sign/interfaces/pixelImage';
import { cropToContent, extractSignature, hasRealTransparency, prepareUpload, recolor, removeSpecks } from '@/modules/sign/utils/ink';

const pixel = (image: PixelImage, x: number, y: number): number[] => Array.from(image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4));

const alphaAt = (image: PixelImage, x: number, y: number): number => pixel(image, x, y)[3];

// A blue stroke on transparency, with soft (antialiased) edges, like an exported PNG signature.
const transparentPng = (): PixelImage => {
  const width  = 60;
  const height = 40;
  const data   = new Uint8ClampedArray(width * height * 4);

  for (let x = 10; x < 50; x += 1) {
    const center = 20 + Math.round(6 * Math.sin(x / 5));

    for (let y = center - 3; y <= center + 3; y += 1) {
      const edge = Math.abs(y - center);
      data.set([40, 70, 180 - edge * 10, edge === 3 ? 90 : 255], (y * width + x) * 4);
    }
  }

  return { data, width, height };
};

// Paper lit from the left (245) falling into a shadow on the right (140), with a 1 px gray stroke
// (darker than its local paper) running across, a dark dot, and some dust.
const shadowedPhoto = (): PixelImage => {
  const width  = 200;
  const height = 120;
  const data   = new Uint8ClampedArray(width * height * 4);
  const paper  = (x: number) => 245 - (105 * x) / width;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const level = paper(x) + ((x * 7 + y * 13) % 5) - 2;
      data.set([level, level, level, 255], (y * width + x) * 4);
    }
  }

  for (let x = 20; x < 180; x += 1) {
    const y     = 60 + Math.round(10 * Math.sin(x / 15));
    const level = paper(x) * 0.45;
    data.set([level, level, level * 1.1, 255], (y * width + x) * 4);
  }

  data.set([paper(150) * 0.8, paper(150) * 0.8, paper(150) * 0.8, 255], (20 * width + 150) * 4);
  return { data, width, height };
};

describe('uploaded signatures', () => {
  it('keeps a transparent PNG identical except for the crop', () => {
    const image    = transparentPng();
    const prepared = prepareUpload({ image: extractSignature(image), color: null, padding: 0 });
    const bounds   = cropToContent({ image, padding: 0 });

    expect(hasRealTransparency(image)).toBe(true);
    expect(prepared).not.toBeNull();
    expect(prepared?.width).toBe(40);
    expect(Array.from(prepared?.data ?? [])).toEqual(Array.from(bounds?.data ?? []));
  });

  it('recolors keeping the alpha, without binarizing', () => {
    const image = transparentPng();
    const black = recolor({ image, color: [17, 17, 17] });

    expect(Array.from(black.data.filter((_, index) => index % 4 === 3))).toEqual(Array.from(image.data.filter((_, index) => index % 4 === 3)));
    expect(pixel(black, 10, 20).slice(0, 3)).toEqual([17, 17, 17]);
  });

  it('removes a shadowed paper and keeps a thin stroke continuous', () => {
    const photo = shadowedPhoto();
    const ink   = extractSignature(photo);

    expect(hasRealTransparency(photo)).toBe(false);

    for (let x = 22; x < 178; x += 1) {
      expect(alphaAt(ink, x, 60 + Math.round(10 * Math.sin(x / 15)))).toBeGreaterThan(200);
    }

    expect(alphaAt(ink, 5, 5)).toBe(0);
    expect(alphaAt(ink, 195, 110)).toBe(0);
    expect(alphaAt(ink, 150, 20)).toBe(0);
  });

  it('drops tiny specks but not strokes', () => {
    const image = { data: new Uint8ClampedArray(10 * 10 * 4), width: 10, height: 10 };
    image.data[(2 * 10 + 2) * 4 + 3] = 255;
    for (let x = 1; x < 9; x += 1) image.data[(7 * 10 + x) * 4 + 3] = 255;

    const clean = removeSpecks(image);
    expect(alphaAt(clean, 2, 2)).toBe(0);
    expect(alphaAt(clean, 5, 7)).toBe(255);
  });
});
