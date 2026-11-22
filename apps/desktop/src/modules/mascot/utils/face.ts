import type { Face } from '@/modules/mascot/interfaces/face';
import type { MascotState } from '@/modules/mascot/types/mascotState';

interface DisplayedFaceParams {
  face     : Face;
  state    : MascotState;
  override : Partial<Face> | undefined;
}

// Overrides only apply while idle so state animations keep their own faces.
export const getDisplayedFace = ({ face, state, override }: DisplayedFaceParams): Face =>
  override && state.type === 'idle' ? { ...face, ...override } : face;
