import { useEffect } from 'react';
import { BREATH } from '@/modules/mascot/constants/animation';
import type { ElementRef } from '@/modules/mascot/interfaces/elements';

// Breathing is only movement: with reduced motion Glup simply rests.
export const useBreath = (breath: ElementRef, reduced: boolean) => {
  useEffect(() => {
    if (reduced) return;

    const animation = breath.current?.animate(BREATH.keyframes, {
      duration   : BREATH.duration,
      easing     : 'ease-in-out',
      iterations : Infinity,
    });

    return () => animation?.cancel();
  }, [breath, reduced]);
};
