import { describe, expect, it } from 'vitest';
import { LIMB_MOTION } from '@/modules/mascot/constants/limbs';
import { gestureDuration } from '@/modules/mascot/utils/limbMotions';

describe('gestureDuration', () => {
  it('a still gesture (reduced motion) lasts as long as the moving one', () => {
    const { beat, times, swap } = LIMB_MOTION.wave;
    const point                 = LIMB_MOTION.point;

    expect(gestureDuration('wave')).toBeCloseTo(times * 2 * beat + swap);
    expect(gestureDuration('point')).toBeCloseTo(point.reach + point.hold + point.back);
    expect(gestureDuration('wave-once')).toBeGreaterThan(0);
  });

  it('the idle gestures are only movement', () => {
    expect(gestureDuration('stretch')).toBe(0);
    expect(gestureDuration('tap-dance')).toBe(0);
  });
});
