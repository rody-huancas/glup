import type { PlacementRequest } from '@/modules/sign/interfaces/placement';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';

export interface SignPdfParams {
  path        : string;
  placements  : PlacementRequest[];
  destination : SaveDestination;
  taskId      : string;
}

export interface SaveSignatureParams {
  bytes : Uint8Array;
  // Keep it for next time (at most MAX_SIGNATURES), or only for this signing.
  keep  : boolean;
}
