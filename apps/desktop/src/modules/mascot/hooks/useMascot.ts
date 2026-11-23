import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { DEFAULT_FACE, IDLE_STATE } from '@/modules/mascot/constants/mascot';
import { useBlink } from '@/modules/mascot/hooks/useBlink';
import { useBreath } from '@/modules/mascot/hooks/useBreath';
import { useEyeTracking } from '@/modules/mascot/hooks/useEyeTracking';
import { useMascotInteractions } from '@/modules/mascot/hooks/useMascotInteractions';
import { useMascotLimbs } from '@/modules/mascot/hooks/useMascotLimbs';
import { useMouthPop } from '@/modules/mascot/hooks/useMouthPop';
import { useStateAnimations } from '@/modules/mascot/hooks/useStateAnimations';
import type { MascotOptions } from '@/modules/mascot/interfaces/controller';
import type { Face } from '@/modules/mascot/interfaces/face';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { createMascotElements } from '@/modules/mascot/utils/elements';
import { getDisplayedFace } from '@/modules/mascot/utils/face';
import { getFixedGaze } from '@/modules/mascot/utils/gaze';
import type { Point } from '@/shared/interfaces/point';

export const useMascot = ({
  onStateChange,
  controllerRef,
  face: faceOverride,
  onClick,
  reactToDrops = true,
  limbs        = true,
}: MascotOptions = {}) => {
  const [state, setState] = useState<MascotState>(IDLE_STATE);
  const [face, setFace]             = useState<Face>(DEFAULT_FACE);
  const [expression, setExpression] = useState<Partial<Face> | null>(null);
  const [look, setLook]             = useState<Point | null>(null);
  const stateRef                    = useRef(state);
  const elements                    = useMemo(createMascotElements, []);
  const blinkingEyes                = useMemo(() => [elements.eyeLeft.open, elements.eyeRight.open], [elements]);
  const fixedGaze                   = useMemo(() => getFixedGaze(state) ?? (state.type === 'idle' ? look : null), [state, look]);
  const displayedFace               = useMemo(
    () => getDisplayedFace({ face, state, override: expression ? { ...faceOverride, ...expression } : faceOverride }),
    [face, state, faceOverride, expression],
  );
  const pointerHandlers   = useMascotInteractions({ setState, onClick, reactToDrops });
  const { gesture }       = useMascotLimbs({ elements, state, enabled: limbs });

  useImperativeHandle(
    controllerRef,
    () => ({
      setState,
      express  : setExpression,
      look     : setLook,
      isIdle   : () => stateRef.current.type === 'idle',
      elements,
      gesture,
    }),
    [elements, gesture],
  );

  useBreath(elements.breath);
  useBlink({ eyes: blinkingEyes, enabled: displayedFace.eyes === 'open' });
  useEyeTracking({ eyes: elements.eyes, fixedGaze });
  useMouthPop({ mouth: displayedFace.mouth, mouths: elements.mouths });
  useStateAnimations({ state, elements, setFace, setState });

  useEffect(() => {
    stateRef.current = state;
    onStateChange?.(state);
  }, [state, onStateChange]);

  return { face: displayedFace, elements, pointerHandlers };
};
