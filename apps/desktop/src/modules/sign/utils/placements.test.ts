import { describe, expect, it } from 'vitest';
import type { Signature } from '@/modules/sign/interfaces/signature';
import {
  changeFontSize,
  createImagePlacement,
  createTextPlacement,
  duplicatePlacement,
  repeatOnAllPages,
  resizeText,
  toRequests,
} from '@/modules/sign/utils/placements';

const A4        = { width: 595, height: 842 };
const LANDSCAPE = { width: 842, height: 595 };
// Every character is half the font size wide.
const measure   = (text: string, fontSize: number) => text.length * fontSize * 0.5;

const signature: Signature = { id: 'firma-1.png', path: 'C:/firmas/firma-1.png', kept: true, url: 'blob:firma', aspect: 0.25 };

describe('placements', () => {
  it('puts a new signature in the center at 30% of the width, keeping its proportions', () => {
    const { rect } = createImagePlacement({ signature, page: 2, pageSize: A4 });

    expect(rect.width).toBeCloseTo(0.3);
    expect((rect.height * A4.height) / (rect.width * A4.width)).toBeCloseTo(0.25);
    expect(rect.x + rect.width / 2).toBeCloseTo(0.5);
    expect(rect.y + rect.height / 2).toBeCloseTo(0.5);
  });

  it('sizes a text from its font and changes the font when resized', () => {
    const text = createTextPlacement({ text: 'Hola', page: 1, pageSize: A4, measure });
    expect(text.rect.height * A4.height).toBeCloseTo(12 * 1.25);

    const bigger = changeFontSize({ placement: text, delta: 2, pageSize: A4, measure });
    expect(bigger.content.kind === 'text' && bigger.content.fontSize).toBe(14);

    const resized = resizeText({ placement: text, rect: { ...text.rect, height: (24 * 1.25) / A4.height }, pageSize: A4, measure });
    expect(resized.content.kind === 'text' && resized.content.fontSize).toBeCloseTo(24);
  });

  it('repeats on every other page, adapting the height to each page', () => {
    const placement = createImagePlacement({ signature, page: 1, pageSize: A4 });
    const copies    = repeatOnAllPages({ placement, pageSizes: [A4, LANDSCAPE, A4], measure });

    expect(copies.map((copy) => copy.page)).toEqual([2, 3]);
    expect(copies[0].rect.height * LANDSCAPE.height).toBeCloseTo(copies[0].rect.width * LANDSCAPE.width * 0.25);
    expect(new Set([placement.id, ...copies.map((copy) => copy.id)]).size).toBe(3);
  });

  it('duplicates next to the original and leaves empty texts out of the request', () => {
    const placement = createImagePlacement({ signature, page: 1, pageSize: A4 });
    const copy      = duplicatePlacement(placement);
    const empty     = createTextPlacement({ text: '  ', page: 1, pageSize: A4, measure });

    expect(copy.rect.x).toBeGreaterThan(placement.rect.x);
    expect(toRequests([placement, empty])).toEqual([{ page: 1, kind: 'image', path: signature.path, ...placement.rect }]);
  });
});
