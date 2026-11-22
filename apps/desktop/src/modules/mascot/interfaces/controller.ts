import type { RefObject } from 'react';
import type { MascotState } from '@/modules/mascot/types/mascotState';

export interface MascotController {
  setState: (state: MascotState) => void;
}

export interface MascotOptions {
  onStateChange? : (state: MascotState) => void;
  controllerRef? : RefObject<MascotController | null>;
  happyEyes?     : boolean;
}
