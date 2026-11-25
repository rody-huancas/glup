import type { PieceLayout } from '@/modules/mascot/interfaces/layout';
import type { PeekLayer } from '@/modules/mascot/interfaces/peekLayer';
import type { PieceName } from '@/modules/mascot/types/pieceName';

// Glup peeking out of the top pill (glup-peek: head, headphones and paws, its base flat). The drawing
// comes without eyes and mouth: the same animated pieces go on top. Measured from glup-peek.png (its
// eyes, its open mouth) and its twin without a face, aligned pixel to pixel:
// - the layer sits in Glup's box so its face lands on the whole Glup's face (same middle between the
//   eyes, the eye spacing as scale), so the face does not jump when one turns into the other;
// - in the peek, the pieces go where that drawing has them: its eyes are a bit smaller for their
//   spacing (0,78), its mouth almost the same (0,97); happy eyes and the other mouths keep their offset
//   to the open eye and the open mouth, scaled alike.
// The CSS variable --peek (0 whole, 1 peeking) carries the layers and the face from one to the other.
export const PEEK_LAYER: PeekLayer = { x: 7.2, y: 9.108, w: 89.167, h: 55.188 };

export const PEEK_PIECES: Partial<Record<PieceName, Pick<PieceLayout, 'x' | 'y' | 'w'>>> = {
  'eye-left'        : { x: 36.388, y: 41.905, w: 8.777 },
  'eye-right'       : { x: 61.083, y: 41.6,   w: 8.777 },
  'eye-happy-left'  : { x: 36.029, y: 43.829, w: 9.496 },
  'eye-happy-right' : { x: 60.705, y: 43.544, w: 9.534 },
  'mouth-smile'     : { x: 48.161, y: 50.689, w: 10.31 },
  'mouth-open'      : { x: 47.116, y: 50.089, w: 12.4 },
  'mouth-o'         : { x: 50.97,  y: 50.439, w: 4.692 },
  'mouth-line'      : { x: 47.63,  y: 52.001, w: 11.372 },
  'mouth-wavy'      : { x: 47.373, y: 51.252, w: 11.886 },
};

// The variable, with its value when nothing sets it (the whole Glup everywhere else).
export const PEEK_VARIABLE = '--peek';
export const PEEK_VALUE    = `var(${PEEK_VARIABLE}, 0)`;
