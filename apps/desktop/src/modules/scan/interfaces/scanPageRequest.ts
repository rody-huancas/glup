import type { Quad } from '@/modules/scan/types/quad';
import type { ScanRotation } from '@/modules/scan/types/scanRotation';

// One page for Rust: its photo, its corners and its turn.
export interface ScanPageRequest {
  path     : string;
  corners  : Quad;
  rotation : ScanRotation;
}
