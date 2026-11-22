import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { IDLE_STATE } from '@/modules/mascot/constants/mascot';
import type { MascotElements } from '@/modules/mascot/interfaces/elements';
import type { Face } from '@/modules/mascot/interfaces/face';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import { createAnimationScope } from '@/modules/mascot/utils/animationScope';
import { STATE_RUNNERS } from '@/modules/mascot/utils/stateRunners';

interface UseStateAnimationsParams {
  state    : MascotState;
  elements : MascotElements;
  setFace  : Dispatch<SetStateAction<Face>>;
  setState : Dispatch<SetStateAction<MascotState>>;
}

export const useStateAnimations = ({ state, elements, setFace, setState }: UseStateAnimationsParams) => {
  useEffect(() => {
    const scope  = createAnimationScope();
    const finish = () => setState(IDLE_STATE);

    void STATE_RUNNERS[state.type]({ state, scope, elements, setFace, finish });

    return () => scope.cancel();
  }, [state, elements, setFace, setState]);
};
