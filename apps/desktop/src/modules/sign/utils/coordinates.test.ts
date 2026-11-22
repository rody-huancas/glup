import { describe, expect, it } from 'vitest';
import type { PageBox } from '@/modules/sign/interfaces/geometry';
import type { PageRotation } from '@/modules/sign/types/pageRotation';
import {
  clampRect,
  moveByPixels,
  relativeToPdfMatrix,
  relativeToScreen,
  resizeFromCorner,
  screenToRelative,
  shownSize,
  shownToPdf,
} from '@/modules/sign/utils/coordinates';

const box = (rotation: PageRotation): PageBox => ({ left: 0, bottom: 0, width: 100, height: 200, rotation });

describe('screen and relative coordinates', () => {
  it('round-trips through any zoom', () => {
    const view = { width: 400, height: 600 };
    const rect = { left: 40, top: 60, width: 120, height: 30 };

    expect(screenToRelative(rect, view)).toEqual({ x: 0.1, y: 0.1, width: 0.3, height: 0.05 });
    expect(relativeToScreen(screenToRelative(rect, view), { width: 800, height: 1200 })).toEqual({ left: 80, top: 120, width: 240, height: 60 });
  });

  it('moves by pixels and stays inside the page', () => {
    const rect = { x: 0.8, y: 0.1, width: 0.3, height: 0.1 };

    expect(clampRect(rect).x).toBeCloseTo(0.7);
    expect(moveByPixels({ rect: { ...rect, x: 0.1 }, dx: 10, dy: -100, view: { width: 100, height: 100 } })).toEqual({ x: 0.2, y: 0, width: 0.3, height: 0.1 });
  });
});

describe('PDF points', () => {
  it('maps the shown top-left corner for every rotation', () => {
    expect(shownToPdf({ box: box(0), x: 0, y: 0 })).toEqual({ x: 0, y: 200 });
    expect(shownToPdf({ box: box(90), x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(shownToPdf({ box: box(180), x: 0, y: 0 })).toEqual({ x: 100, y: 0 });
    expect(shownToPdf({ box: box(270), x: 0, y: 0 })).toEqual({ x: 100, y: 200 });
    expect(shownSize(box(90))).toEqual({ width: 200, height: 100 });
  });

  it('follows an offset crop box', () => {
    const crop = { left: 100, bottom: 200, width: 300, height: 300, rotation: 0 as const };
    expect(relativeToPdfMatrix({ x: 0.5, y: 0.5, width: 0.5, height: 0.5 }, crop)).toEqual({ a: 150, b: 0, c: 0, d: 150, e: 250, f: 200 });
  });

  it('keeps a signature upright on a page rotated 90°', () => {
    const page = { left: 0, bottom: 0, width: 595, height: 842, rotation: 90 as const };
    expect(relativeToPdfMatrix({ x: 0, y: 0, width: 1, height: 1 }, page)).toEqual({ a: 0, b: 842, c: -595, d: 0, e: 595, f: 0 });
  });
});

describe('resizeFromCorner', () => {
  const rect   = { left: 100, top: 100, width: 100, height: 50 };
  const bounds = { width: 500, height: 500 };

  it('keeps the proportions and the opposite corner', () => {
    expect(resizeFromCorner({ rect, corner: 'bottom-right', dx: 50, dy: 0, bounds, minSize: 16 })).toEqual({ left: 100, top: 100, width: 150, height: 75 });
    expect(resizeFromCorner({ rect, corner: 'top-left', dx: -20, dy: 0, bounds, minSize: 16 })).toEqual({ left: 80, top: 90, width: 120, height: 60 });
  });

  it('never leaves the page or gets too small', () => {
    expect(resizeFromCorner({ rect, corner: 'bottom-right', dx: 1000, dy: 0, bounds, minSize: 16 }).width).toBe(400);
    expect(resizeFromCorner({ rect, corner: 'bottom-right', dx: -1000, dy: 0, bounds, minSize: 16 }).width).toBe(16);
  });
});
