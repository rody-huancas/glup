import { useEffect, useRef } from 'react';
import { BLINK } from '@/modules/mascot/constants/animation';
import type { ElementRef } from '@/modules/mascot/interfaces/elements';
import { randomBetween } from '@/shared/utils/math';

interface UseBlinkParams {
  eyes    : ElementRef<HTMLImageElement>[];
  enabled : boolean;
}

export const useBlink = ({ eyes, enabled }: UseBlinkParams) => {
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    let nextBlink   = 0;
    let doubleBlink = 0;

    const blink = () => {
      if (!enabledRef.current) return;

      eyes.forEach((eye) => {
        eye.current?.animate(BLINK.keyframes, { duration: BLINK.duration, easing: 'ease-in-out' });
      });
    };

    const schedule = () => {
      nextBlink = window.setTimeout(() => {
        blink();

        if (Math.random() < BLINK.doubleChance) {
          doubleBlink = window.setTimeout(blink, BLINK.duration + BLINK.doubleGap);
        }

        schedule();
      }, randomBetween(BLINK.minInterval, BLINK.maxInterval));
    };

    schedule();

    return () => {
      window.clearTimeout(nextBlink);
      window.clearTimeout(doubleBlink);
    };
  }, [eyes]);
};
