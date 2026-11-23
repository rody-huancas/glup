import { describe, expect, it } from 'vitest';
import { ID_PHOTO_TEXTS } from '@/modules/id-photo/constants/idPhoto';
import { moveCrop, photoOnScreen, zoomCrop } from '@/modules/id-photo/utils/cropMath';
import { choiceProblem, customSizeProblem, parseCm } from '@/modules/id-photo/utils/customSize';

describe('custom size', () => {
  it('reads centimeters with comma or dot', () => {
    expect(parseCm('3,5')).toBe(3.5);
    expect(parseCm(' 4.5 ')).toBe(4.5);
    expect(parseCm('')).toBeNull();
    expect(parseCm('abc')).toBeNull();
    expect(parseCm('0')).toBeNull();
  });

  it('only takes sizes from 1 to 10 cm', () => {
    expect(customSizeProblem({ width: '2,5', height: '3' })).toBeNull();
    expect(customSizeProblem({ width: '0,5', height: '3' })).toBe(ID_PHOTO_TEXTS.badSize);
    expect(customSizeProblem({ width: '3', height: '12' })).toBe(ID_PHOTO_TEXTS.badSize);
    expect(customSizeProblem({ width: '', height: '3' })).toBe(ID_PHOTO_TEXTS.badSize);
  });

  it('needs the photo, the sheet or both', () => {
    const format = { kind: 'passport' as const, widthCm: 3.5, heightCm: 4.5 };
    expect(choiceProblem({ format, outputs: { photo: true, sheet: false } })).toBeNull();
    expect(choiceProblem({ format, outputs: { photo: false, sheet: false } })).toBe(ID_PHOTO_TEXTS.noOutput);
  });
});

describe('crop on screen', () => {
  const suggested = { x: 100, y: 50, width: 350, height: 450 };

  it('dragging moves the crop the other way', () => {
    expect(moveCrop({ crop: suggested, dx: 20, dy: -10, scale: 0.5 })).toEqual({ x: 60, y: 70, width: 350, height: 450 });
  });

  it('zooms around the center keeping the proportion, within limits', () => {
    const bigger = zoomCrop({ crop: suggested, suggested, factor: 2 });
    expect(bigger.width).toBeCloseTo(175);
    expect(bigger.height).toBeCloseTo(225);
    expect(bigger.x + bigger.width / 2).toBeCloseTo(275);

    expect(zoomCrop({ crop: suggested, suggested, factor: 10 }).width).toBeCloseTo(350 / 3);
    expect(zoomCrop({ crop: suggested, suggested, factor: 0.1 }).width).toBeCloseTo(700);
  });

  it('places the photo so the crop fills the frame', () => {
    const screen = photoOnScreen(suggested, 225, { width: 1000, height: 1200 });
    expect(screen.scale).toBe(0.5);
    expect(screen).toEqual({ scale: 0.5, left: -50, top: -25, width: 500, height: 600 });
  });
});
