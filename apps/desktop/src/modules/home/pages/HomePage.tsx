import { DropZone } from '@/modules/home/components/DropZone';
import { HomeActionsCard } from '@/modules/home/components/HomeActionsCard';
import { QuickTools } from '@/modules/home/components/QuickTools';
import { HOME_TEXTS } from '@/modules/home/constants/home';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { TaskCard } from '@/modules/tasks/components/TaskCard';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { getQueuedCount, getVisibleTask } from '@/modules/tasks/utils/taskView';
import { PageHeader } from '@/shared/components/PageHeader';

// One full-width column; the drop zone takes the free height, so Home always fills the panel without scrolling.
// Below it: the files being chosen, otherwise the running task or its result, otherwise the quick tools.
export const HomePage = ({ files }: PageProps) => {
  const tasks       = useTasks();
  const task        = getVisibleTask(tasks);
  const actionsOpen = Boolean(files.selection || files.loading);
  const showTask    = !actionsOpen && task !== null;

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader title={HOME_TEXTS.title} subtitle={HOME_TEXTS.subtitle} />
      <DropZone files={files} compact={actionsOpen || showTask} />
      {actionsOpen && <HomeActionsCard files={files} />}
      {showTask && task && <TaskCard task={task} queued={getQueuedCount(tasks)} />}
      {!actionsOpen && !showTask && <QuickTools onRun={files.runTool} />}
    </div>
  );
};

// export const HomePage = ({ files }: PageProps) => {
//   const actionsOpen = Boolean(files.selection || files.loading);
//
//   return (
//     <div className="flex h-full flex-col gap-3">
//       <PageHeader title={HOME_TEXTS.title} subtitle={HOME_TEXTS.subtitle} />
//       <DropZone files={files} compact={actionsOpen} />
//       {actionsOpen ? <HomeActionsCard files={files} /> : <QuickTools onRun={files.runTool} />}
//     </div>
//   );
// };
