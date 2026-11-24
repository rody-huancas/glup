import type { SkippedFile } from '@/modules/folder-sort/interfaces/skippedFile';
import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';

export interface SortReport {
  moved     : number;
  folders   : number;
  skipped   : SkippedFile[];
  failed    : string[];
  cancelled : boolean;
  // The record to undo it (null when nothing moved).
  undoId    : string | null;
  summary   : TaskSummary;
}
