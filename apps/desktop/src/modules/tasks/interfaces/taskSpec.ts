import type { ActionProgress, ActionReport } from '@/modules/actions/interfaces/actionReport';
import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { SelectionType } from '@/modules/actions/types/fileType';
import type { PageId } from '@/modules/main-window/types/pageId';

export interface TaskContext {
  taskId      : string;
  onProgress  : (progress: ActionProgress) => void;
  isCancelled : () => boolean;
}

// What to run; the store queues it and runs one task at a time.
export interface TaskSpec {
  title     : string;
  actionId? : ActionId | null;
  type      : SelectionType | null;
  fileCount : number;
  // The screen that shows its result (actions on files: home; the Limpieza scan: cleanup).
  owner     : PageId;
  // A file report (actions) or a result ready to show (Limpieza).
  run       : (context: TaskContext) => Promise<ActionReport | ActionResult>;
  // run       : (context: TaskContext) => Promise<ActionReport>;
}
