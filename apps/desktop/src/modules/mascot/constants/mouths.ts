import type { MouthKind } from '@/modules/mascot/types/mouthKind';
import type { PieceName } from '@/modules/mascot/types/pieceName';

export const MOUTH_KINDS: MouthKind[] = ['smile', 'open', 'o', 'line', 'wavy'];

export const MOUTH_PIECES: Record<MouthKind, PieceName> = {
  smile : 'mouth-smile',
  open  : 'mouth-open',
  o     : 'mouth-o',
  line  : 'mouth-line',
  wavy  : 'mouth-wavy',
};
