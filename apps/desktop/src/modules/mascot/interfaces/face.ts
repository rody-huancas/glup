import type { EyeStyle } from '@/modules/mascot/types/eyeStyle';
import type { MouthKind } from '@/modules/mascot/types/mouthKind';

export interface Face {
  mouth : MouthKind;
  eyes  : EyeStyle;
}
