import { describe, expect, it } from 'vitest';
import { fitRect, loupeAt } from '@/modules/scan/utils/layout';

describe('the review screen', () => {
  it('fits the photo in its box', () => {
    expect(fitRect({ width: 400, height: 300 }, { width: 1200, height: 1600 })).toEqual({ x: 87.5, y: 0, width: 225, height: 300 });
    expect(fitRect({ width: 400, height: 300 }, { width: 0, height: 10 })).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('keeps the magnifier off the corner and inside the box', () => {
    const box = { width: 600, height: 400 };
    expect(loupeAt({ x: 300, y: 300, box, size: 100, gap: 20 })).toEqual({ left: 180, top: 180 });
    // Top left corner: it goes below and to the right.
    expect(loupeAt({ x: 30, y: 30, box, size: 100, gap: 20 })).toEqual({ left: 50, top: 50 });
    // Never past the other edge either.
    expect(loupeAt({ x: 90, y: 395, box, size: 100, gap: 20 })).toEqual({ left: 110, top: 275 });
  });
});
