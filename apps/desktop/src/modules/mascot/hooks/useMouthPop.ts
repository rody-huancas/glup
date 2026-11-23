import { useEffect } from 'react';
import { BOUNCE_EASING, MOUTH_POP } from '@/modules/mascot/constants/animation';
import type { MascotElements } from '@/modules/mascot/interfaces/elements';
import type { MouthKind } from '@/modules/mascot/types/mouthKind';

interface UseMouthPopParams {
  mouth   : MouthKind;
  mouths  : MascotElements['mouths'];
  // With reduced motion the mouth just changes, without the pop.
  reduced : boolean;
}

export const useMouthPop = ({ mouth, mouths, reduced }: UseMouthPopParams) => {
  useEffect(() => {
    if (reduced) return;

    const animation = mouths[mouth].current?.animate(MOUTH_POP.keyframes, {
      duration : MOUTH_POP.duration,
      easing   : BOUNCE_EASING,
    });

    return () => animation?.cancel();
  }, [mouth, mouths, reduced]);
};
