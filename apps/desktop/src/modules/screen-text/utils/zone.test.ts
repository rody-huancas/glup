import { describe, expect, it } from 'vitest';
import { isZoneChosen, toStillZone, zoneBetween } from '@/modules/screen-text/utils/zone';

const BOUNDS = { width: 1536, height: 864 };

describe('zoneBetween', () => {
  it('is the same rectangle whatever the direction of the drag', () => {
    const zone = { x: 100, y: 50, width: 200, height: 80 };

    expect(zoneBetween({ start: { x: 100, y: 50 }, end: { x: 300, y: 130 }, bounds: BOUNDS })).toEqual(zone);
    expect(zoneBetween({ start: { x: 300, y: 130 }, end: { x: 100, y: 50 }, bounds: BOUNDS })).toEqual(zone);
    expect(zoneBetween({ start: { x: 300, y: 50 }, end: { x: 100, y: 130 }, bounds: BOUNDS })).toEqual(zone);
  });

  it('stays inside the overlay when the cursor goes past its edges', () => {
    expect(zoneBetween({ start: { x: 1500, y: 800 }, end: { x: 1700, y: 950 }, bounds: BOUNDS })).toEqual({ x: 1500, y: 800, width: 36, height: 64 });
    expect(zoneBetween({ start: { x: 20, y: 30 }, end: { x: -40, y: -10 }, bounds: BOUNDS })).toEqual({ x: 0, y: 0, width: 20, height: 30 });
  });

  it('takes a click for nothing', () => {
    expect(isZoneChosen(zoneBetween({ start: { x: 10, y: 10 }, end: { x: 11, y: 40 }, bounds: BOUNDS }))).toBe(false);
    expect(isZoneChosen(zoneBetween({ start: { x: 10, y: 10 }, end: { x: 60, y: 40 }, bounds: BOUNDS }))).toBe(true);
  });
});

describe('toStillZone', () => {
  const zone = { x: 100, y: 200, width: 300, height: 50 };

  it('at 100 % a CSS pixel is a screen pixel', () => {
    expect(toStillZone({ zone, shown: { width: 1920, height: 1080 }, still: { width: 1920, height: 1080 } })).toEqual(zone);
  });

  it('at 125 % and 150 % it grows by the scale', () => {
    expect(toStillZone({ zone, shown: { width: 1536, height: 864 }, still: { width: 1920, height: 1080 } })).toEqual({ x: 125, y: 250, width: 375, height: 62.5 });
    expect(toStillZone({ zone, shown: { width: 1280, height: 720 }, still: { width: 1920, height: 1080 } })).toEqual({ x: 150, y: 300, width: 450, height: 75 });
  });

  it('a 2560x1440 monitor at 150 % (1706,67 CSS pixels wide) reaches its last pixel', () => {
    const still  = { width: 2560, height: 1440 };
    const shown  = { width: 2560 / 1.5, height: 960 };
    const result = toStillZone({ zone: { x: 2560 / 1.5 - 100, y: 0, width: 100, height: 960 }, shown, still });

    expect(result.x).toBeCloseTo(2410, 6);
    expect(result.width).toBeCloseTo(150, 6);
    expect(result.x + result.width).toBeCloseTo(2560, 6);
    expect(result.height).toBeCloseTo(1440, 6);
  });

  it('two monitors with different scales: each overlay maps with its own', () => {
    const main  = toStillZone({ zone, shown: { width: 1536, height: 864 }, still: { width: 1920, height: 1080 } });
    const other = toStillZone({ zone, shown: { width: 1280, height: 1024 }, still: { width: 1280, height: 1024 } });

    expect(main).toEqual({ x: 125, y: 250, width: 375, height: 62.5 });
    expect(other).toEqual(zone);
  });

  it('a still that is not drawn yet gives an empty zone', () => {
    expect(toStillZone({ zone, shown: { width: 0, height: 0 }, still: { width: 1920, height: 1080 } })).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});
