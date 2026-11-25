import type { MarkFont, MarkKind, MarkPlace } from '@/modules/photo-mark/types/markTypes';

// MarkOptions in services/photo_mark (also what is remembered in marca.json).
export interface MarkOptions {
  kind    : MarkKind;
  text    : string;
  font    : MarkFont;
  color   : string;
  shadow  : boolean;
  logo    : string | null;
  place   : MarkPlace;
  // Of the shorter side of each photo.
  size    : number;
  opacity : number;
}
