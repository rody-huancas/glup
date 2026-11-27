import { describe, expect, it } from 'vitest';
import { densityWidths } from '@/lib/image-widths';

describe('densityWidths', () => {
  it('offers 1x, 2x and 3x of what is shown', () => {
    expect(densityWidths(40, 500)).toEqual([40, 80, 120]);
  });

  it('never goes past the picture itself, nor repeats', () => {
    expect(densityWidths(334, 656)).toEqual([334, 656]);
    expect(densityWidths(300, 200)).toEqual([200]);
  });
});
