import type { RefObject } from 'react';
import type { MascotElements } from '@/modules/mascot/interfaces/elements';
import type { Face } from '@/modules/mascot/interfaces/face';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import type { Point } from '@/shared/interfaces/point';

// express and look only show while idle, so they never interrupt eating, working and the rest.
export interface MascotController {
  setState : (state: MascotState) => void;
  express  : (face: Partial<Face> | null) => void;
  look     : (gaze: Point | null) => void;
  isIdle   : () => boolean;
  elements : MascotElements;
}

export interface MascotOptions {
  onStateChange? : (state: MascotState) => void;
  controllerRef? : RefObject<MascotController | null>;
  face?          : Partial<Face>;
  onClick?       : () => void;
  reactToDrops?  : boolean;
}
