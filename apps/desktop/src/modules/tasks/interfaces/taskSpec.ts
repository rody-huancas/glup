import type { ActionProgress, ActionReport } from '@/modules/actions/interfaces/actionReport';
import type { SelectionType } from '@/modules/actions/types/fileType';

export interface TaskContext {
  taskId      : string;
  onProgress  : (progress: ActionProgress) => void;
  isCancelled : () => boolean;
}

// What to run; the store queues it and runs one task at a time.
export interface TaskSpec {
  title     : string;
  type      : SelectionType | null;
  fileCount : number;
  run       : (context: TaskContext) => Promise<ActionReport>;
}
