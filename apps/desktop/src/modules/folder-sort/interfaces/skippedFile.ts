import type { SkipReason } from '@/modules/folder-sort/types/skipReason';

export interface SkippedFile {
  name   : string;
  reason : SkipReason;
}
