import type { ResultTone } from '@/modules/actions/types/resultTone';
import type { PageId } from '@/modules/main-window/types/pageId';

// The toast for a finished task: its result line, where "Ver" goes and, for a sorted folder, the record
// "Deshacer" undoes.
export interface TaskToast {
  taskId  : string;
  message : string;
  tone    : ResultTone;
  owner   : PageId;
  undoId? : string;
}
