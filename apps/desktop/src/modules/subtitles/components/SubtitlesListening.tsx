import { WorkingStatus } from '@/modules/actions/components/WorkingStatus';
import { LEARN_MASCOT_WIDTH } from '@/modules/background/constants/background';
import { useAttentiveMascot } from '@/modules/background/hooks/useAttentiveMascot';
import { Mascot } from '@/modules/mascot/components/Mascot';
import { SUBTITLES_TEXTS } from '@/modules/subtitles/constants/texts';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { cancelTask } from '@/modules/tasks/store/taskStore';

interface SubtitlesListeningProps {
  taskId : string | null;
}

// The listening task with Glup working: its turn, the download the first time, preparing, listening,
// the phrases; and Cancelar.
export const SubtitlesListening = ({ taskId }: SubtitlesListeningProps) => {
  const task          = useTasks().find((each) => each.id === taskId);
  const controllerRef = useAttentiveMascot(task?.status === 'running');

  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0" style={{ width: LEARN_MASCOT_WIDTH }}>
        <Mascot controllerRef={controllerRef} reactToDrops={false} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {task?.status === 'queued' ? (
          <p role="status" className="text-[13px] text-muted">{SUBTITLES_TEXTS.queued}</p>
        ) : (
          <WorkingStatus progress={task?.progress ?? null} fileCount={1} actionId="subtitles" cancelling={task?.cancelling ?? false} onCancel={() => taskId && cancelTask(taskId)} />
        )}
      </div>
    </div>
  );
};
