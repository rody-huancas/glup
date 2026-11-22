import { useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { DEFAULT_FACE, IDLE_STATE } from '@/modules/mascot/constants/mascot';
import { useBlink } from '@/modules/mascot/hooks/useBlink';
import { useBreath } from '@/modules/mascot/hooks/useBreath';
import { useEyeTracking } from '@/modules/mascot/hooks/useEyeTracking';
import { useMascotInteractions } from '@/modules/mascot/hooks/useMascotInteractions';
import { useMouthPop } from '@/modules/mascot/hooks/useMouthPop';
import { useStateAnimations } from '@/modules/mascot/hooks/useStateAnimations';
import type { MascotOptions } from '@/modules/mascot/interfaces/controller';
import type { Face } from '@/modules/mascot/interfaces/face';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { createMascotElements } from '@/modules/mascot/utils/elements';
import { getDisplayedFace } from '@/modules/mascot/utils/face';
import { getFixedGaze } from '@/modules/mascot/utils/gaze';

export const useMascot = ({ onStateChange, controllerRef, happyEyes = false }: MascotOptions = {}) => {
  const [state, setState] = useState<MascotState>(IDLE_STATE);
  const [face, setFace]   = useState<Face>(DEFAULT_FACE);
  const elements          = useMemo(createMascotElements, []);
  const blinkingEyes      = useMemo(() => [elements.eyeLeft.open, elements.eyeRight.open], [elements]);
  const fixedGaze         = useMemo(() => getFixedGaze(state), [state]);
  const displayedFace     = useMemo(() => getDisplayedFace({ face, state, happyEyes }), [face, state, happyEyes]);
  const pointerHandlers   = useMascotInteractions(setState);

  useImperativeHandle(controllerRef, () => ({ setState }), []);

  useBreath(elements.breath);
  useBlink({ eyes: blinkingEyes, enabled: displayedFace.eyes === 'open' });
  useEyeTracking({ eyes: elements.eyes, fixedGaze });
  useMouthPop({ mouth: displayedFace.mouth, mouths: elements.mouths });
  useStateAnimations({ state, elements, setFace, setState });

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  return { face: displayedFace, elements, pointerHandlers };
};
