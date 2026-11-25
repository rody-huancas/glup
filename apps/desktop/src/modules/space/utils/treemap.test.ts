import { describe, expect, it } from 'vitest';
import { percentOf, treemap } from '@/modules/space/utils/treemap';

const box = { x: 0, y: 0, width: 600, height: 400 };
const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x + 0.001 < b.x + b.width && b.x + 0.001 < a.x + a.width && a.y + 0.001 < b.y + b.height && b.y + 0.001 < a.y + a.height;

describe('the map of what takes space', () => {
  it('gives each one an area of its share, inside the box, without overlaps', () => {
    const sizes  = [500, 250, 120, 80, 30, 15, 5];
    const placed = treemap({ items: sizes, sizeOf: (size) => size, box });
    const total  = sizes.reduce((sum, size) => sum + size, 0);
    expect(placed).toHaveLength(sizes.length);
    for (const rect of placed) {
      expect((rect.width * rect.height) / (600 * 400)).toBeCloseTo(rect.item / total, 6);
      expect(rect.x).toBeGreaterThanOrEqual(-0.001);
      expect(rect.y).toBeGreaterThanOrEqual(-0.001);
      expect(rect.x + rect.width).toBeLessThanOrEqual(600.001);
      expect(rect.y + rect.height).toBeLessThanOrEqual(400.001);
    }
    for (let a = 0; a < placed.length; a += 1) {
      for (let b = a + 1; b < placed.length; b += 1) expect(overlap(placed[a], placed[b])).toBe(false);
    }
    // The area is filled whole.
    expect(placed.reduce((sum, rect) => sum + rect.width * rect.height, 0)).toBeCloseTo(600 * 400, 3);
  });

  it('keeps the rectangles close to squares and leaves the empty ones out', () => {
    const placed = treemap({ items: [1, 1, 1, 1], sizeOf: (size) => size, box: { x: 0, y: 0, width: 400, height: 400 } });
    expect(placed.every((rect) => Math.abs(rect.width - rect.height) < 1)).toBe(true);
    expect(treemap({ items: [0, 0], sizeOf: (size) => size, box })).toEqual([]);
    expect(treemap({ items: [10, 0], sizeOf: (size) => size, box })).toHaveLength(1);
    expect(treemap({ items: [10], sizeOf: (size) => size, box })[0]).toMatchObject({ x: 0, y: 0, width: 600, height: 400 });
  });

  it('says the share of each one', () => {
    expect(percentOf(34, 100)).toBe('34 %');
    expect(percentOf(4, 1000)).toBe('0,4 %');
    expect(percentOf(1, 100000)).toBe('< 0,1 %');
    expect(percentOf(0, 10)).toBe('0 %');
  });
});
