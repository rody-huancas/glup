import { useEffect } from 'react';
import { BOUNCE_EASING, MOUTH_POP } from '@/modules/mascot/constants/animation';
import type { MascotElements } from '@/modules/mascot/interfaces/elements';
import type { MouthKind } from '@/modules/mascot/types/mouthKind';

interface UseMouthPopParams {
  mouth  : MouthKind;
  mouths : MascotElements['mouths'];
}

export const useMouthPop = ({ mouth, mouths }: UseMouthPopParams) => {
  useEffect(() => {
    const animation = mouths[mouth].current?.animate(MOUTH_POP.keyframes, {
      duration : MOUTH_POP.duration,
      easing   : BOUNCE_EASING,
    });

    return () => animation?.cancel();
  }, [mouth, mouths]);
};
