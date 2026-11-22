import type { Task } from '@/modules/tasks/interfaces/task';

// The task the panel shows: the one running, otherwise the oldest result not closed yet.
export const getVisibleTask = (tasks: Task[]): Task | null =>
  tasks.find((task) => task.status === 'running') ?? tasks.find((task) => task.status === 'done') ?? null;

export const getRunningTask = (tasks: Task[]): Task | null => tasks.find((task) => task.status === 'running') ?? null;

export const getQueuedCount = (tasks: Task[]): number => tasks.filter((task) => task.status === 'queued').length;

// 0 to 1 by finished files or pages; null when it cannot be told (one file).
export const getTaskFraction = (task: Task): number | null => {
  const progress = task.progress;
  if (!progress || progress.total <= 1) return null;
  return progress.current / progress.total;
};
