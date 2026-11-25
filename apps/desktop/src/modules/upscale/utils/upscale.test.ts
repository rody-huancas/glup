import { describe, expect, it } from 'vitest';
import { fitsLimit, outputSize, tooBigCount } from '@/modules/upscale/utils/upscale';

describe('the size of an improved photo', () => {
  it('is two or four times bigger, within a limit', () => {
    expect(outputSize([1000, 750], 4)).toEqual([4000, 3000]);
    expect(outputSize([1000, 750], 1)).toEqual([1000, 750]);
    expect(fitsLimit([6000, 6000], 1)).toBe(true);
    expect(fitsLimit([1000, 750], 4)).toBe(true);
    expect(fitsLimit([3000, 2000], 2)).toBe(true);
    expect(fitsLimit([4000, 3000], 2)).toBe(false);
    expect(tooBigCount([[1000, 750], [4000, 3000], null], 4)).toBe(1);
  });
});
