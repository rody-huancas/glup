import type { PieceName } from '@/modules/mascot/types/pieceName';

// 'behind-body': drawn before the body (arms and feet).
export type PieceLayer = 'behind-body';

// Rotation point in % of the piece itself, used as transform-origin.
export interface Pivot {
  x : number;
  y : number;
}

export interface PieceLayout {
  x      : number;
  y      : number;
  w      : number;
  layer? : PieceLayer;
  pivot? : Pivot;
}

export interface BaseSize {
  width  : number;
  height : number;
}

export interface MascotLayout {
  base   : BaseSize;
  pieces : Record<PieceName, PieceLayout>;
}
