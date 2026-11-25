import { describe, expect, it } from 'vitest';
import { NETWORKS } from '@/modules/social/constants/sizes';
import { CENTERED, frameFor, framingOnFace, keepRatio, moveFraming, zoomFraming } from '@/modules/social/utils/frame';

const sizes = NETWORKS.flatMap((network) => network.sizes);

describe('the frame of Tamaño para redes', () => {
  it('keeps the shape of every size on a wide and a tall photo', () => {
    expect(sizes.length).toBeGreaterThanOrEqual(15);
    for (const size of sizes) {
      for (const [width, height] of [[4000, 3000], [1080, 1920]]) {
        const frame = frameFor({ photoAspect: width / height, targetAspect: size.width / size.height, framing: CENTERED });
        expect((frame.width * width) / (frame.height * height)).toBeCloseTo(size.width / size.height, 3);
        // At zoom 1 it touches two sides of the photo.
        expect(frame.width === 1 || frame.height === 1).toBe(true);
        expect(frame.x).toBeGreaterThanOrEqual(0);
        expect(frame.x + frame.width).toBeLessThanOrEqual(1.000001);
      }
    }
  });

  it('is dragged and zoomed without leaving the photo', () => {
    const story = { photoAspect: 4 / 3, targetAspect: 9 / 16 };
    const start = frameFor({ ...story, framing: CENTERED });
    expect(start.width).toBeCloseTo(0.421875);
    const right = moveFraming({ ...story, framing: CENTERED, dx: 0.9, dy: 0 });
    expect(frameFor({ ...story, framing: right }).x + start.width).toBeCloseTo(1);
    // Back from the edge right away, not after the distance dragged past it.
    const back = moveFraming({ ...story, framing: right, dx: -0.1, dy: 0 });
    expect(frameFor({ ...story, framing: back }).x).toBeCloseTo(1 - start.width - 0.1);
    const close = zoomFraming({ ...story, framing: CENTERED, zoom: 2 });
    expect(frameFor({ ...story, framing: close }).height).toBeCloseTo(0.5);
    expect(zoomFraming({ ...story, framing: CENTERED, zoom: 9 }).zoom).toBe(4);
  });

  it('starts on a face, and keeps the proportion of a custom size', () => {
    expect(framingOnFace({ x: 0.6, y: 0.2, width: 0.2, height: 0.3 })).toEqual({ cx: 0.7, cy: 0.38, zoom: 1 });
    expect(framingOnFace(null)).toEqual(CENTERED);
    expect(keepRatio(1080, 16 / 9)).toBe(1920);
  });
});
