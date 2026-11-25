import { FamilyGrid } from '@/modules/families/components/FamilyGrid';
import type { FamilyId } from '@/modules/families/types/familyId';
import { familyPage } from '@/modules/families/utils/families';
import { DropZone } from '@/modules/home/components/DropZone';
import { HomeActionsCard } from '@/modules/home/components/HomeActionsCard';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { TaskCard } from '@/modules/tasks/components/TaskCard';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { tasksForPage } from '@/modules/tasks/utils/taskOwner';
import { getQueuedCount, getVisibleTask } from '@/modules/tasks/utils/taskView';

// The big mint card (Glup, the question, «Elegir archivos» and the drop zone) and, under it, the six
// families. With files chosen the card becomes a one-line bar and the actions take the families' place;
// with a task running, the task does.
export const HomePage = ({ files, onNavigate }: PageProps) => {
  // Only the tasks Inicio owns (actions on files); others show on their own screen.
  const tasks       = tasksForPage(useTasks(), 'home');
  const task        = getVisibleTask(tasks);
  const actionsOpen = Boolean(files.selection || files.loading);
  const showTask    = !actionsOpen && task !== null;
  const open        = (family: FamilyId) => onNavigate(familyPage(family));

  return (
    <div className="flex h-full flex-col gap-4">
      <DropZone files={files} compact={actionsOpen || showTask} />
      {actionsOpen && <HomeActionsCard files={files} />}
      {showTask && task && <TaskCard task={task} queued={getQueuedCount(tasks)} />}
      {!actionsOpen && !showTask && <FamilyGrid onOpen={open} />}
    </div>
  );
};
