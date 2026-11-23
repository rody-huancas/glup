import type { CopyState } from '@/modules/history/types/copyState';

// The line just copied again, and whether it worked.
export interface CopiedLine {
  id    : string;
  state : CopyState;
}
