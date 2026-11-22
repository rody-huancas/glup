import type { ActionProgress } from '@/modules/actions/interfaces/actionReport';
import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import type { SelectionType } from '@/modules/actions/types/fileType';
import type { TaskStatus } from '@/modules/tasks/types/taskStatus';

// One run of an action. It outlives the panel: collapsing the island never cancels or drops it,
// and a finished result stays until the user closes it.
export interface Task {
  id         : string;
  title      : string;
  type       : SelectionType | null;
  fileCount  : number;
  status     : TaskStatus;
  progress   : ActionProgress | null;
  result     : ActionResult | null;
  cancelling : boolean;
}
