import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';

export interface RemoveReport {
  toTrash   : number;
  removed   : number;
  changed   : number;
  inUse     : number;
  failed    : number;
  cancelled : boolean;
  summary   : TaskSummary;
}
