import type { IdleMoveKind } from '@/modules/island/types/idleMove';
import type { Face } from '@/modules/mascot/interfaces/face';
import type { Point } from '@/shared/interfaces/point';

type MascotMood = 'excited' | 'celebrating' | 'farewell';

// Faces Glup puts on around the opening and closing (only shown while it is idle).
export const MASCOT_FACES: Record<MascotMood, Partial<Face>> = {
  excited     : { mouth: 'o' },
  celebrating : { eyes: 'happy', mouth: 'open' },
  farewell    : { eyes: 'happy' },
};

// Durations in seconds; distances in screen pixels; angles in degrees.
export const MASCOT_MOTION = {
  eyes      : { scale: 1.1, duration: 0.15, ease: 'back.out(2)' },
  arc       : { height: 14, rise: 0.4, riseEase: 'power2.out', fallEase: 'power2.in' },
  tilt      : { from: -8, to: 6, lean: 0.35, swing: 0.4, ease: 'sine.inOut' },
  hop       : { height: 6, up: 0.1, upEase: 'power2.out', down: 0.15, downEase: 'back.out(2)' },
  celebrate : { hold: 0.6 },
  // lead: flight start after the goodbye wave (Recoger, Esc) · leaveLead: when the cursor left, no wave.
  farewell  : { hold: 0.15, lead: 0.28, leaveLead: 0 },
};

const LOOK_LEFT: Point           = { x: -1, y: 0 };
const LOOK_RIGHT: Point          = { x: 1, y: 0 };
const IDLE_MOVES: IdleMoveKind[] = ['look', 'sway', 'hop', 'stretch', 'tap-dance'];

// Short idle moves while the panel is open and still, one picked at random every few seconds.
export const MASCOT_IDLE = {
  minDelay : 6,
  maxDelay : 10,
  moves    : IDLE_MOVES,
  look     : { left: LOOK_LEFT, right: LOOK_RIGHT, hold: 0.7 },
  sway     : { angle: 4, beat: 0.25, swings: 2, ease: 'sine.inOut' },
};
