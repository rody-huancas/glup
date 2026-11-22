import type { Face } from '@/modules/mascot/interfaces/face';
import type { MascotState } from '@/modules/mascot/types/mascotState';

interface DisplayedFaceParams {
  face      : Face;
  state     : MascotState;
  happyEyes : boolean;
}

// Forced happy eyes only apply while idle so state animations keep their own faces.
export const getDisplayedFace = ({ face, state, happyEyes }: DisplayedFaceParams): Face =>
  happyEyes && state.type === 'idle' ? { ...face, eyes: 'happy' } : face;
