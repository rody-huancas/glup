import type { Task } from '@/modules/tasks/interfaces/task';
import { useTasks } from '@/modules/tasks/hooks/useTasks';

// The task running the scan or the cleaning, for its progress and its Cancelar.
export const useCleanupTask = (taskId: string | null): Task | null => {
  const tasks = useTasks();
  return taskId ? (tasks.find((task) => task.id === taskId) ?? null) : null;
};
