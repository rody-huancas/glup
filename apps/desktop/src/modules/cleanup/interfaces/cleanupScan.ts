import type { CleanupCategory } from '@/modules/cleanup/interfaces/cleanupCategory';
import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';

export interface CleanupScan {
  categories : CleanupCategory[];
  cancelled  : boolean;
  summary    : TaskSummary;
}
