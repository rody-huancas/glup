import { describe, expect, it } from 'vitest';
import { CONFUSED, HAPPY, WORKING } from '@/modules/mascot/constants/animation';
import { stillKeyframes, stillOptions } from '@/modules/mascot/utils/stillMotion';

const JUMPS = [{ transform: 'translateY(0)' }, { transform: 'translateY(-12px)', offset: 0.4, easing: 'ease-out' }, { transform: 'translateY(0)' }];

describe('still motion (reduced motion)', () => {
  it('an animation that comes back holds its rest pose, without moving', () => {
    const still = stillKeyframes(JUMPS, { duration: 400, iterations: 3 });

    expect(still).toEqual([{ transform: 'translateY(0)' }, { transform: 'translateY(0)' }]);
    expect(still[0]).toEqual(still[1]);
  });

  it('an animation that keeps its end shows that pose, still', () => {
    const still = stillKeyframes(JUMPS, { duration: 400, fill: 'forwards' });
    expect(still).toEqual([{ transform: 'translateY(0)' }, { transform: 'translateY(0)' }]);

    const tilt = stillKeyframes([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-8deg)', easing: 'ease-in' }], { fill: 'forwards' });
    expect(tilt).toEqual([{ transform: 'rotate(-8deg)' }, { transform: 'rotate(-8deg)' }]);
  });

  it('keeps the timing, so the state lasts the same and is never skipped', () => {
    const options = { duration: HAPPY.duration, easing: 'ease-in-out', iterations: HAPPY.jumps, direction: 'alternate' as const };

    expect(stillOptions(options)).toEqual({ duration: HAPPY.duration, iterations: HAPPY.jumps, delay: undefined, fill: undefined });
    expect(stillOptions({ duration: WORKING.duration, iterations: Infinity })).toEqual({ duration: WORKING.duration, iterations: Infinity, delay: undefined, fill: undefined });
  });

  it('every pose of Glup is still: the first and last frames are the same', () => {
    [HAPPY.keyframes, CONFUSED.keyframes, WORKING.keyframes].forEach((keyframes) => {
      const [from, to] = stillKeyframes(keyframes, { fill: 'forwards' });
      expect(from).toEqual(to);
    });
  });
});
