import type { CSSProperties } from 'react';
import { MASCOT_LAYOUT } from '@/modules/mascot/constants/layout';
import { PEEK_LAYER, PEEK_PIECES, PEEK_VALUE } from '@/modules/mascot/constants/peek';
import type { PieceName } from '@/modules/mascot/types/pieceName';

// From the whole Glup's spot to the peeking one's, as --peek goes from 0 to 1.
const toward = (whole: number, peek: number | undefined): string =>
  peek === undefined ? `${whole}%` : `calc(${whole}% + ${(peek - whole).toFixed(3)}% * ${PEEK_VALUE})`;

export const getPieceStyle = (name: PieceName): CSSProperties => {
  const { x, y, w } = MASCOT_LAYOUT.pieces[name];
  const peek        = PEEK_PIECES[name];

  return {
    left  : toward(x, peek?.x),
    top   : toward(y, peek?.y),
    width : toward(w, peek?.w),
  };
};

// The body (and what goes with it: arms, feet, held files) fades as the peek comes, and the other way.
export const WHOLE_STYLE: CSSProperties = { opacity: `calc(1 - ${PEEK_VALUE})` };

export const getPeekLayerStyle = (): CSSProperties => ({
  left    : `${PEEK_LAYER.x}%`,
  top     : `${PEEK_LAYER.y}%`,
  width   : `${PEEK_LAYER.w}%`,
  height  : `${PEEK_LAYER.h}%`,
  opacity : PEEK_VALUE,
});

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
