import type { ActionProgress, ActionReport } from '@/modules/actions/interfaces/actionReport';
import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';

// A task as Rust keeps it (get_active_tasks, task-finished).
export interface TaskRecord {
  id       : string;
  actionId : string;
  progress : ActionProgress | null;
  report   : ActionReport | null;
  error    : string | null;
  finished : boolean;
  summary  : TaskSummary | null;
}
