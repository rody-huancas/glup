import { DropZone } from '@/modules/home/components/DropZone';
import { HomeActionsCard } from '@/modules/home/components/HomeActionsCard';
import { HomeDashboard } from '@/modules/home/components/HomeDashboard';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { TaskCard } from '@/modules/tasks/components/TaskCard';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { tasksForPage } from '@/modules/tasks/utils/taskOwner';
import { getQueuedCount, getVisibleTask } from '@/modules/tasks/utils/taskView';

// The mint strip (Glup, the question and «Elegir archivos», the drop zone) and, under it, the summary
// of what Glup and you did. With files chosen the strip becomes a one-line bar and the actions take the
// summary's place; with a task running, the task does.
export const HomePage = ({ files, onNavigate }: PageProps) => {
  // Only the tasks Inicio owns (actions on files); others show on their own screen.
  const tasks       = tasksForPage(useTasks(), 'home');
  const task        = getVisibleTask(tasks);
  const actionsOpen = Boolean(files.selection || files.loading);
  const showTask    = !actionsOpen && task !== null;

  return (
    <div className="@container flex flex-col gap-3">
      <DropZone files={files} compact={actionsOpen || showTask} />
      {actionsOpen && <HomeActionsCard files={files} />}
      {showTask && task && <TaskCard task={task} queued={getQueuedCount(tasks)} />}
      {!actionsOpen && !showTask && <HomeDashboard files={files} onNavigate={onNavigate} />}
    </div>
  );
};
