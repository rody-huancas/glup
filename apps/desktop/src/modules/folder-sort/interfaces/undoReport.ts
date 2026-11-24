import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';

export interface UndoReport {
  restored  : number;
  missing   : string[];
  occupied  : string[];
  failed    : string[];
  cancelled : boolean;
  // Cancelled before the end: it can still be finished.
  pending   : boolean;
  summary   : TaskSummary;
}
