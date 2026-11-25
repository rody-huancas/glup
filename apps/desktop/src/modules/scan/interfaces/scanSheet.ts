import type { Quad } from '@/modules/scan/types/quad';
import type { ScanRotation } from '@/modules/scan/types/scanRotation';

// One photo of the screen: how it is going, its corners and its turn.
export interface ScanSheet {
  id       : string;
  path     : string;
  name     : string;
  status   : 'loading' | 'ready' | 'failed';
  error    : string | null;
  width    : number;
  height   : number;
  corners  : Quad;
  found    : boolean;
  rotation : ScanRotation;
  // The photo as the webview can show it (upright, small).
  url      : string | null;
}
