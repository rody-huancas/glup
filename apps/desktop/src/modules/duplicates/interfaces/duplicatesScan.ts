import type { DuplicateGroup } from '@/modules/duplicates/interfaces/duplicateGroup';
import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';

export interface DuplicatesScan {
  groups    : DuplicateGroup[];
  files     : number;
  freeable  : number;
  scanned   : number;
  cloudOnly : number;
  // Folders of programs and projects left whole.
  projects  : number;
  cancelled : boolean;
  summary   : TaskSummary;
}
