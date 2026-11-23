import type { ResultTone } from '@/modules/actions/types/resultTone';
import type { PageId } from '@/modules/main-window/types/pageId';

// The toast for a finished task: its result line and where "Ver" goes.
export interface TaskToast {
  taskId  : string;
  message : string;
  tone    : ResultTone;
  owner   : PageId;
}
