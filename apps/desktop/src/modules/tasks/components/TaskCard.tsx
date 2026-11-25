import { ActionResultView } from '@/modules/actions/components/ActionResultView';
import { CloseButton } from '@/modules/actions/components/CloseButton';
import { WorkingStatus } from '@/modules/actions/components/WorkingStatus';
import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import { getSelectionIcon } from '@/modules/actions/utils/fileIcon';
import { FamilyScope } from '@/modules/families/components/FamilyScope';
import { FAMILY_STYLES } from '@/modules/families/constants/families';
import { familyOfTask } from '@/modules/families/utils/families';
import { TASK_TEXTS } from '@/modules/tasks/constants/tasks';
import type { Task } from '@/modules/tasks/interfaces/task';
import { cancelTask, dismissTaskResult } from '@/modules/tasks/store/taskStore';
import { openResult, revealResult } from '@/modules/tasks/utils/outputs';
import { TextResultView } from '@/modules/text/components/TextResultView';
import { TOOLS } from '@/modules/tools/constants/tools';
import { Card } from '@/shared/components/Card';
import { FileChip } from '@/shared/components/FileChip';
import { ChevronLeftIcon } from '@/shared/icons/ChevronLeftIcon';
import { cx } from '@/shared/utils/classNames';

interface TaskCardProps {
  task   : Task;
  queued : number;
}

// The running task (progress and Cancelar) or its result, which stays until closed with x or Volver. In
// the color of its tool's family: its fill, its border and, through FamilyScope, its bar and buttons.
export const TaskCard = ({ task, queued }: TaskCardProps) => {
  const done   = task.status === 'done' && task.result !== null;
  const result = task.result;
  const family = familyOfTask(task, TOOLS);
  const tone   = family ? FAMILY_STYLES[family] : null;

  return (
    <FamilyScope family={family} className="flex shrink-0 flex-col gap-2">
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
      <Card className={cx('p-3.5', tone && `${tone.dark} ${tone.border}`)}>
        <div className="flex items-center gap-1.5">
          <FileChip icon={task.type ? getSelectionIcon(task.type) : null} label={task.title} />
          {done && <CloseButton onClose={() => dismissTaskResult(task.id)} />}
        </div>
        {done && result?.text ? (
          <TextResultView message={result.message} extracted={result.text} onBack={() => dismissTaskResult(task.id)} />
        ) : done && result ? (
          <ActionResultView result={result} onOpen={() => openResult(result)} onReveal={() => revealResult(result)} />
        ) : (
          <div className="mt-3">
            <WorkingStatus progress={task.progress} fileCount={task.fileCount} actionId={task.actionId} cancelling={task.cancelling} onCancel={() => cancelTask(task.id)} />
          </div>
        )}
        {queued > 0 && <p className="mt-2 text-[11px] text-muted">{TASK_TEXTS.waiting(queued)}</p>}
      </Card>
    </FamilyScope>
  );
};
