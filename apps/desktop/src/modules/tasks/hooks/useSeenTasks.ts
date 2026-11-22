import { useEffect } from 'react';
import type { PageId } from '@/modules/main-window/types/pageId';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { dismissTaskResult } from '@/modules/tasks/store/taskStore';
import { tasksForPage } from '@/modules/tasks/utils/taskOwner';

// For screens that show results their own way (Limpieza shows its list): while the screen is on,
// its finished tasks count as seen and leave the queue.
export const useSeenTasks = (page: PageId) => {
  const tasks = useTasks();

  useEffect(() => {
    tasksForPage(tasks, page)
      .filter((task) => task.status === 'done')
      .forEach((task) => dismissTaskResult(task.id));
  }, [tasks, page]);
};
