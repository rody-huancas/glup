import { describe, expect, it } from 'vitest';
import { KIND_ORDER } from '@/modules/space/constants/texts';
import { contrast, mapColor } from '@/modules/space/utils/colors';

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) as [number, number, number];

describe('the colours of the map', () => {
  it('are stronger the more the kind dominates', () => {
    const weak   = mapColor('videos', 0.3);
    const strong = mapColor('videos', 1);
    expect(strong.fill).toBe('#f6c36b');
    // Paler when videos barely win: closer to the light grey, further from the yellow.
    const distance = (a: string, b: string) => rgb(a).reduce((sum, value, index) => sum + Math.abs(value - rgb(b)[index]), 0);
    expect(distance(weak.fill, '#e4e3ea')).toBeLessThan(distance(strong.fill, '#e4e3ea'));
    expect(mapColor('photos', 0.6).fill).not.toBe(mapColor('photos', 0.9).fill);
  });

  it('always have letters that read on them', () => {
    for (const kind of KIND_ORDER) {
      for (const share of [0, 0.25, 0.5, 0.75, 1]) {
        const color = mapColor(kind, share);
        expect(contrast(rgb(color.fill), rgb(color.text))).toBeGreaterThanOrEqual(4.5);
      }
    }
    // Light colours get dark letters.
    expect(mapColor('videos', 1).text).toBe('#18171e');
    expect(mapColor('programs', 1).text).toBe('#18171e');
  });
});
