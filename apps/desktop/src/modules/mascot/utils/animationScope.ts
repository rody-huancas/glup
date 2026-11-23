import type { AnimateParams, AnimationScope } from '@/modules/mascot/interfaces/animationScope';
import { stillKeyframes, stillOptions } from '@/modules/mascot/utils/stillMotion';

// reduced: prefers-reduced-motion. Every animation becomes its still pose for the same time, so the
// states (and their faces) last the same and nothing is skipped.
export const createAnimationScope = (reduced: boolean = false): AnimationScope => {
  const animations = new Set<Animation>();
  const timers     = new Set<number>();
  let cancelled    = false;

  const animate = ({ element, keyframes, options }: AnimateParams): Animation | null => {
    if (cancelled || !element) return null;

    const animation = reduced ? element.animate(stillKeyframes(keyframes, options), stillOptions(options)) : element.animate(keyframes, options);
    animations.add(animation);
    return animation;
  };

  // Promises from a cancelled scope never resolve, so pending sequences stop silently.
  const finished = (animation: Animation | null): Promise<void> =>
    new Promise((resolve) => {
      if (!animation) {
        if (!cancelled) resolve();
        return;
      }

      animation.finished
        .then(() => {
          if (!cancelled) resolve();
        })
        .catch(() => undefined);
    });

  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      if (cancelled) return;

      const timer = window.setTimeout(() => {
        timers.delete(timer);
        resolve();
      }, ms);

      timers.add(timer);
    });

  const cancel = () => {
    cancelled = true;
    timers.forEach((timer) => window.clearTimeout(timer));
    animations.forEach((animation) => animation.cancel());
    timers.clear();
    animations.clear();
  };

  return { animate, finished, wait, cancel };
};
