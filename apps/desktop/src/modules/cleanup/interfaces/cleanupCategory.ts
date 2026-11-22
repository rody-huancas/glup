import type { CleanupItem } from '@/modules/cleanup/interfaces/cleanupItem';
import type { CategoryId } from '@/modules/cleanup/types/categoryId';
import type { CleanMethod } from '@/modules/cleanup/types/cleanMethod';

export interface CleanupCategory {
  id      : CategoryId;
  method  : CleanMethod;
  items   : CleanupItem[];
  // What it would free (repeated files: every copy but one).
  total   : number;
  count   : number;
  // Open browsers: their files in use will stay.
  running : string[];
}
