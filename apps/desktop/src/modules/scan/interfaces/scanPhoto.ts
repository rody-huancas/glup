import type { Quad } from '@/modules/scan/types/quad';

// A photo opened by Rust (open_scan_photo): its proportion and the sheet it found in it.
export interface ScanPhoto {
  path    : string;
  width   : number;
  height  : number;
  corners : Quad;
  // A sheet stood out; if not, the corners are the whole photo.
  found   : boolean;
}
