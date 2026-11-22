import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';

// Only what really went away counts as freed; what went to the recycle bin is told apart.
export interface CleanReport {
  freed     : number;
  toTrash   : number;
  removed   : number;
  inUse     : number;
  changed   : number;
  failed    : number;
  cancelled : boolean;
  summary   : TaskSummary;
}
