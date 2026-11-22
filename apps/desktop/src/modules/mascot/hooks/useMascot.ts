import { useMemo, useState } from 'react';
import { DEFAULT_FACE, IDLE_STATE } from '@/modules/mascot/constants/mascot';
import { useBlink } from '@/modules/mascot/hooks/useBlink';
import { useBreath } from '@/modules/mascot/hooks/useBreath';
import { useEyeTracking } from '@/modules/mascot/hooks/useEyeTracking';
import { useMascotInteractions } from '@/modules/mascot/hooks/useMascotInteractions';
import { useMouthPop } from '@/modules/mascot/hooks/useMouthPop';
import { useStateAnimations } from '@/modules/mascot/hooks/useStateAnimations';
import type { Face } from '@/modules/mascot/interfaces/face';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { createMascotElements } from '@/modules/mascot/utils/elements';
import { getFixedGaze } from '@/modules/mascot/utils/gaze';

export const useMascot = () => {
  const [state, setState] = useState<MascotState>(IDLE_STATE);
  const [face, setFace]   = useState<Face>(DEFAULT_FACE);
  const elements          = useMemo(createMascotElements, []);
  const blinkingEyes      = useMemo(() => [elements.eyeLeft.open, elements.eyeRight.open], [elements]);
  const fixedGaze         = useMemo(() => getFixedGaze(state), [state]);
  const pointerHandlers   = useMascotInteractions(setState);

  useBreath(elements.breath);
  useBlink({ eyes: blinkingEyes, enabled: face.eyes === 'open' });
  useEyeTracking({ eyes: elements.eyes, fixedGaze });
  useMouthPop({ mouth: face.mouth, mouths: elements.mouths });
  useStateAnimations({ state, elements, setFace, setState });

  return { face, elements, pointerHandlers };
};
