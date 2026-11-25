import { describe, expect, it } from 'vitest';
import { correction, defaultWidth, estimateBytes, HEAVY_BYTES, widthChoices } from '@/modules/media/utils/animation';

describe('Video a GIF', () => {
  it('offers the widths that fit the video, or its own when it is narrower', () => {
    expect(widthChoices(1920)).toEqual([320, 480, 640]);
    expect(widthChoices(540)).toEqual([320, 480, 540]);
    expect(widthChoices(300)).toEqual([300]);
    expect(widthChoices(640)).toEqual([320, 480, 640]);
    expect(defaultWidth([320, 480, 640])).toBe(480);
    expect(defaultWidth([300])).toBe(300);
  });

  it('estimates the weight from pixels, frames and format, and learns from a preview', () => {
    const base = { format: 'gif' as const, width: 480, sourceWidth: 1920, sourceHeight: 1080, fps: 15, seconds: 6, factor: 1 };
    // 480 × 270 × 90 frames × 0.25.
    expect(estimateBytes(base)).toBe(2916000);
    expect(estimateBytes({ ...base, format: 'webp' })).toBe(583200);
    expect(estimateBytes({ ...base, fps: 10 })).toBeLessThan(estimateBytes(base));
    expect(estimateBytes({ ...base, width: 640, seconds: 20 })).toBeGreaterThan(HEAVY_BYTES);
    // Never wider than the video.
    expect(estimateBytes({ ...base, width: 640, sourceWidth: 320, sourceHeight: 240 })).toBe(320 * 240 * 90 * 0.25);
    expect(correction(1_000_000, 2_000_000)).toBe(0.5);
    expect(estimateBytes({ ...base, factor: 0.5 })).toBe(1458000);
    expect(correction(0, 100)).toBe(1);
  });
});
