import { describe, expect, it } from 'vitest';
import { dropIndex, isSamePlace } from '@/modules/organize/utils/dropIndex';

// Two rows of three 100x100 tiles with 20 px gaps.
const boxes = [0, 1, 2, 3, 4, 5].map((index) => ({ left: (index % 3) * 120, top: Math.floor(index / 3) * 120, width: 100, height: 100 }));

describe('dropIndex', () => {
  it('lands before a tile on its left half and after it on its right half', () => {
    expect(dropIndex({ boxes, point: { x: 130, y: 50 } })).toBe(1);
    expect(dropIndex({ boxes, point: { x: 190, y: 50 } })).toBe(2);
  });

  it('works on the second row, in gaps and past the end of a row', () => {
    expect(dropIndex({ boxes, point: { x: 10, y: 170 } })).toBe(3);
    expect(dropIndex({ boxes, point: { x: 110, y: 50 } })).toBe(1);
    expect(dropIndex({ boxes, point: { x: 500, y: 50 } })).toBe(3);
    expect(dropIndex({ boxes, point: { x: 500, y: 170 } })).toBe(6);
  });

  it('above the first row counts as the first row', () => {
    expect(dropIndex({ boxes, point: { x: 10, y: -40 } })).toBe(0);
    expect(dropIndex({ boxes: [], point: { x: 0, y: 0 } })).toBe(0);
  });
});

describe('isSamePlace', () => {
  it('dropping a page right before or after itself changes nothing', () => {
    expect(isSamePlace([1, 2, 3], [2], 1)).toBe(true);
    expect(isSamePlace([1, 2, 3], [2], 2)).toBe(true);
    expect(isSamePlace([1, 2, 3], [2], 0)).toBe(false);
    expect(isSamePlace([1, 2, 3, 4], [1, 3], 2)).toBe(false);
  });
});
