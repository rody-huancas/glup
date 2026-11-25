import { describe, expect, it } from 'vitest';
import { overlayStyle } from '@/modules/subtitles/utils/overlay';

describe('the phrase over the preview', () => {
  it('has the size it will have drawn on the picture, by its height', () => {
    // A 1080p video shown at 360 px tall: 63 px drawn → a third.
    expect(overlayStyle({ width: 640, height: 360 }).fontSize).toBeCloseTo(20.88);
    expect(overlayStyle({ width: 1280, height: 720 }).fontSize).toBeCloseTo(41.76);
    // A vertical video: by its width, so 42 characters fit across.
    expect(overlayStyle({ width: 270, height: 480 }).fontSize).toBeCloseTo(11.34);
    expect(overlayStyle({ width: 640, height: 360 }).bottom).toBeCloseTo(21.6);
  });
});
