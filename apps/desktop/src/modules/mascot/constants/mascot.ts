import type { Face } from '@/modules/mascot/interfaces/face';
import type { MascotState } from '@/modules/mascot/types/mascotState';

export const IDLE_STATE: MascotState = { type: 'idle' };

export const DEFAULT_FACE: Face = {
  mouth : 'smile',
  eyes  : 'open',
};
