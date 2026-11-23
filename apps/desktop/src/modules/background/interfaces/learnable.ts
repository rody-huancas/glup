import type { ModelStatus } from '@/modules/background/interfaces/modelStatus';
import type { LearnableId } from '@/modules/background/types/learnableId';
import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';

// Something Glup downloads once, with permission, to learn a new skill: the background model or the
// video program. The learning step and Ajustes › "Lo que aprendí" work the same for each one.
export interface Learnable {
  id        : LearnableId;
  texts     : {
    body       : (size: string) => string;
    learning   : string;
    taskTitle  : string;
    // The line in "Lo que aprendí".
    learned    : (size: string) => string;
    // What happens if it is deleted.
    deleteBody : string;
  };
  getStatus : () => Promise<ModelStatus>;
  download  : (taskId: string) => Promise<TaskSummary>;
  remove    : () => Promise<void>;
}
