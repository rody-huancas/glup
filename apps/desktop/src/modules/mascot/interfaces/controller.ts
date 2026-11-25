import type { RefObject } from 'react';
import type { MascotElements } from '@/modules/mascot/interfaces/elements';
import type { Face } from '@/modules/mascot/interfaces/face';
import type { MascotGesture } from '@/modules/mascot/types/mascotGesture';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import type { Point } from '@/shared/interfaces/point';

// express and look only show while idle, so they never interrupt eating, working and the rest.
export interface MascotController {
  setState : (state: MascotState) => void;
  express  : (face: Partial<Face> | null) => void;
  look     : (gaze: Point | null) => void;
  isIdle   : () => boolean;
  elements : MascotElements;
  // Arm and foot moves; resolves when done (or right away if they cannot play now).
  gesture  : (name: MascotGesture) => Promise<void>;
}

export interface MascotOptions {
  onStateChange? : (state: MascotState) => void;
  controllerRef? : RefObject<MascotController | null>;
  face?          : Partial<Face>;
  onClick?       : () => void;
  reactToDrops?  : boolean;
  // False hides nothing but stops animating arms and feet (where they cannot be seen).
  limbs?         : boolean;
  // Also has the peeking Glup (the island's), shown as --peek goes to 1.
  peek?          : boolean;
}
