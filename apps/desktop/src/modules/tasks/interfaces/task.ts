import type { ActionProgress } from '@/modules/actions/interfaces/actionReport';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import type { PageId } from '@/modules/main-window/types/pageId';
import type { SelectionType } from '@/modules/actions/types/fileType';
import type { TaskStatus } from '@/modules/tasks/types/taskStatus';

// One run of an action. It outlives the panel: collapsing the island never cancels or drops it,
// and a finished result stays until the user closes it.
export interface Task {
  id         : string;
  title      : string;
  // The action it runs (for "Pasando a texto…"); null for a download alone.
  actionId   : ActionId | null;
  type       : SelectionType | null;
  fileCount  : number;
  status     : TaskStatus;
  progress   : ActionProgress | null;
  result     : ActionResult | null;
  cancelling : boolean;
  // The screen that shows its progress and result.
  owner      : PageId;
  finishedAt : number | null;
  // When it was queued (the most recent task in progress decides the screen on opening).
  createdAt  : number;
}
