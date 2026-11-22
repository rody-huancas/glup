import type { PieceName } from '@/modules/mascot/types/pieceName';

export interface PieceLayout {
  x : number;
  y : number;
  w : number;
}

export interface BaseSize {
  width  : number;
  height : number;
}

export interface MascotLayout {
  base   : BaseSize;
  pieces : Record<PieceName, PieceLayout>;
}
