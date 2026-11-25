import { describe, expect, it } from 'vitest';
import type { Quad } from '@/modules/scan/types/quad';
import { isConvexQuad, moveCorner, nudgeCorner, outsidePath } from '@/modules/scan/utils/corners';

const sheet: Quad = [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.12 }, { x: 0.88, y: 0.9 }, { x: 0.12, y: 0.88 }];

describe('the corners of a sheet', () => {
  it('move one corner and stay inside the photo', () => {
    const moved = moveCorner({ corners: sheet, index: 2, point: { x: 1.4, y: 0.5 } });
    expect(moved[2]).toEqual({ x: 1, y: 0.5 });
    expect(moved[0]).toBe(sheet[0]);
    expect(sheet[2]).toEqual({ x: 0.88, y: 0.9 });
  });

  it('move with the arrows, more with Shift, and ignore other keys', () => {
    expect(nudgeCorner({ corners: sheet, index: 0, key: 'ArrowRight', big: false })?.[0].x).toBeCloseTo(0.104);
    expect(nudgeCorner({ corners: sheet, index: 0, key: 'ArrowUp', big: true })?.[0].y).toBeCloseTo(0.06);
    expect(nudgeCorner({ corners: sheet, index: 0, key: 'Enter', big: false })).toBeNull();
    expect(nudgeCorner({ corners: [{ x: 0, y: 0 }, sheet[1], sheet[2], sheet[3]], index: 0, key: 'ArrowLeft', big: true })?.[0].x).toBe(0);
  });

  it('know when they cross', () => {
    expect(isConvexQuad(sheet)).toBe(true);
    expect(isConvexQuad([sheet[0], sheet[2], sheet[1], sheet[3]])).toBe(false);
    // One corner pulled inside: not a sheet any more.
    expect(isConvexQuad([sheet[0], sheet[1], { x: 0.3, y: 0.3 }, sheet[3]])).toBe(false);
  });

  it('cut the sheet out of the darkened photo', () => {
    expect(outsidePath(sheet, 100, 200)).toBe('M0 0 H100 V200 H0 Z M10 20 L90 24 L88 180 L12 176 Z');
  });
});
