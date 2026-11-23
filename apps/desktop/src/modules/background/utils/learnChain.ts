import type { Learnable } from '@/modules/background/interfaces/learnable';
import type { TaskSpec } from '@/modules/tasks/interfaces/taskSpec';
import { summaryToResult } from '@/modules/tasks/utils/taskResult';

interface WithLearningParams {
  learnable : Learnable;
  run       : TaskSpec['run'];
}

// One task for the whole way: download what is missing, then the action that asked for it, under the
// same card and the same Cancelar. A cancelled or failed download ends there with its own words.
export const withLearning = ({ learnable, run }: WithLearningParams): TaskSpec['run'] => async (context) => {
  const summary = await learnable.download(context.taskId);
  if (context.isCancelled()) return summaryToResult(summary);

  const status = await learnable.getStatus().catch(() => null);
  return status?.installed ? run(context) : summaryToResult(summary);
};
