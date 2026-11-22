import type { Dispatch, SetStateAction } from 'react';
import type { AnimationScope } from '@/modules/mascot/interfaces/animationScope';
import type { MascotElements } from '@/modules/mascot/interfaces/elements';
import type { Face } from '@/modules/mascot/interfaces/face';
import type { MascotState } from '@/modules/mascot/types/mascotState';

export interface StateRunnerParams {
  state    : MascotState;
  scope    : AnimationScope;
  elements : MascotElements;
  setFace  : Dispatch<SetStateAction<Face>>;
  finish   : () => void;
}

export type StateRunner = (params: StateRunnerParams) => Promise<void>;
