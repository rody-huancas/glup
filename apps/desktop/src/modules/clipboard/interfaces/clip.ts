import type { ClipKind } from '@/modules/clipboard/types/clipKind';

// A line of the Portapapeles as Rust sends it (the whole text and the image stay in Rust).
export interface Clip {
  id      : string;
  kind    : ClipKind;
  // The first lines of a text (empty for an image).
  preview : string;
  width   : number;
  height  : number;
  // The program it came from, when Windows said.
  source  : string | null;
  date    : string;
  pinned  : boolean;
}
