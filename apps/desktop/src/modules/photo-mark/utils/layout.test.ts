import { describe, expect, it } from 'vitest';
import { margin, markHeight, mosaicCenters, placeAt } from '@/modules/photo-mark/utils/layout';

describe('where the mark goes', () => {
  it('is sized by the shorter side', () => {
    expect(markHeight(4000, 3000, 0.05)).toBe(150);
    expect(markHeight(400, 300, 0.05)).toBe(15);
    expect(margin(1000, 800)).toBe(32);
  });

  it('has nine places with their margin, as Rust puts them', () => {
    const at = (place: Parameters<typeof placeAt>[0]['place']) => placeAt({ place, width: 1000, height: 800, markW: 100, markH: 40 });
    expect(at('top-left')).toEqual([32, 32]);
    expect(at('top')).toEqual([450, 32]);
    expect(at('right')).toEqual([868, 380]);
    expect(at('center')).toEqual([450, 380]);
    expect(at('bottom-left')).toEqual([32, 728]);
    expect(at('bottom-right')).toEqual([868, 728]);
  });

  it('covers the whole photo in mosaic', () => {
    const centers = mosaicCenters({ width: 1200, height: 800, markW: 200, markH: 40 });
    expect(centers.length).toBeGreaterThan(10);
    for (const [x, y] of [[0, 0], [1200, 800], [600, 400], [1200, 0]]) {
      const nearest = Math.min(...centers.map(([cx, cy]) => Math.hypot(cx - x, cy - y)));
      expect(nearest).toBeLessThan(260);
    }
    expect(mosaicCenters({ width: 1200, height: 800, markW: 400, markH: 80 }).length).toBeLessThan(centers.length);
  });
});
