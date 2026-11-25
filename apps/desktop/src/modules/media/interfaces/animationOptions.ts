import type { AnimationFormat } from '@/modules/media/types/animationFormat';

export interface AnimationOptions {
  format      : AnimationFormat;
  width       : number;
  fps         : number;
  loopForever : boolean;
}

// The real animation made for «Ver cómo queda» (served to the screen), and its weight.
export interface AnimationPreview {
  url    : string;
  size   : number;
  width  : number;
  height : number;
}
