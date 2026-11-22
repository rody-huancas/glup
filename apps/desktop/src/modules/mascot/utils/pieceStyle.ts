import type { CSSProperties } from 'react';
import { MASCOT_LAYOUT } from '@/modules/mascot/constants/layout';
import type { PieceName } from '@/modules/mascot/types/pieceName';

export const getPieceStyle = (name: PieceName): CSSProperties => {
  const { x, y, w } = MASCOT_LAYOUT.pieces[name];

  return {
    left  : `${x}%`,
    top   : `${y}%`,
    width : `${w}%`,
  };
};

// Limbs rotate around their own pivot.
export const getLimbStyle = (name: PieceName): CSSProperties => {
  const pivot = MASCOT_LAYOUT.pieces[name].pivot;

  return {
    ...getPieceStyle(name),
    transformOrigin: pivot ? `${pivot.x}% ${pivot.y}%` : undefined,
  };
};

export const getBodyAspectRatio = (): string => `${MASCOT_LAYOUT.base.width} / ${MASCOT_LAYOUT.base.height}`;

export const getVisibilityClass = (visible: boolean): string => (visible ? 'opacity-100' : 'opacity-0');
