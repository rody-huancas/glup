import type { CleanReport } from '@/modules/cleanup/interfaces/cleanReport';
import type { CleanupCategory } from '@/modules/cleanup/interfaces/cleanupCategory';
import type { CategoryId } from '@/modules/cleanup/types/categoryId';
import type { CleanupPhase } from '@/modules/cleanup/types/cleanupPhase';

export interface CleanupState {
  phase      : CleanupPhase;
  // The task running the scan or the cleaning (its progress and Cancelar).
  taskId     : string | null;
  categories : CleanupCategory[];
  // Marked item paths, plus RECYCLE_BIN_KEY for "vaciar papelera".
  selected   : Set<string>;
  report     : CleanReport | null;
  // Bumped after a cleaning, so the disk bar is read again.
  diskRead   : number;
  // Cards opened by the person (kept when leaving the page).
  expanded   : Set<CategoryId>;
  // The scan task, until the next scan (to recognize its notice).
  scanTaskId : string | null;
  finishedAt : number | null;
  // A result arrived while the person was elsewhere: the menu shows a dot.
  unseen     : boolean;
  // Moved to the task store (owner screens): reveal     : boolean;
  // The last result was too old and was dropped.
  expired    : boolean;
}
