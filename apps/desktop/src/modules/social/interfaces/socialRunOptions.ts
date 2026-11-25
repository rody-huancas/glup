import type { PhotoFrame } from '@/modules/photo-tools/interfaces/photoFrame';
import type { SocialFit, SocialFormat } from '@/modules/social/types/socialFit';

// Sent to Rust (SocialOptions in services/social).
export interface SocialRunOptions {
  width  : number;
  height : number;
  tag    : string;
  format : SocialFormat;
  fit    : SocialFit;
  fill   : string;
  blur   : boolean;
  // The frame of each photo, in the order they came.
  frames : PhotoFrame[];
}
