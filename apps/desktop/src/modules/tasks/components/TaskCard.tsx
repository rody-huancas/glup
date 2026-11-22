import { ActionResultView } from '@/modules/actions/components/ActionResultView';
import { CloseButton } from '@/modules/actions/components/CloseButton';
import { WorkingStatus } from '@/modules/actions/components/WorkingStatus';
import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import { getSelectionIcon } from '@/modules/actions/utils/fileIcon';
import { TASK_TEXTS } from '@/modules/tasks/constants/tasks';
import type { Task } from '@/modules/tasks/interfaces/task';
import { cancelTask, dismissTaskResult } from '@/modules/tasks/store/taskStore';
import { openResult, revealResult } from '@/modules/tasks/utils/outputs';
import { Card } from '@/shared/components/Card';
import { FileChip } from '@/shared/components/FileChip';
import { ChevronLeftIcon } from '@/shared/icons/ChevronLeftIcon';

interface TaskCardProps {
  task   : Task;
  queued : number;
}

// The running task (progress and Cancelar) or its result, which stays until closed with x or Volver.
export const TaskCard = ({ task, queued }: TaskCardProps) => {
  const done   = task.status === 'done' && task.result !== null;
  const result = task.result;

  return (
    <section className="flex shrink-0 flex-col gap-2">
      {done && (
        <button
          type="button"
          onClick={() => dismissTaskResult(task.id)}
          className="flex w-fit cursor-pointer items-center gap-1 text-[13px] font-semibold text-lilac hover:text-lilac-soft"
        >
          <ChevronLeftIcon className="size-4" />
          {ACTIONS_TEXTS.back}
        </button>
      )}
      <Card className="p-3.5">
        <div className="flex items-center gap-1.5">
          <FileChip icon={task.type ? getSelectionIcon(task.type) : null} label={task.title} />
          {done && <CloseButton onClose={() => dismissTaskResult(task.id)} />}
        </div>
        {done && result ? (
          <ActionResultView result={result} onOpen={() => openResult(result)} onReveal={() => revealResult(result)} />
        ) : (
          <div className="mt-3">
            <WorkingStatus progress={task.progress} fileCount={task.fileCount} cancelling={task.cancelling} onCancel={() => cancelTask(task.id)} />
          </div>
        )}
        {queued > 0 && <p className="mt-2 text-[11px] text-muted">{TASK_TEXTS.waiting(queued)}</p>}
      </Card>
    </section>
  );
};
