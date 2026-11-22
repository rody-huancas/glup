import { ACTION_OWNERS, DEFAULT_OWNER } from '@/modules/tasks/constants/owners';
import type { Task } from '@/modules/tasks/interfaces/task';
import type { TaskReveal } from '@/modules/tasks/interfaces/taskReveal';
import type { PageId } from '@/modules/main-window/types/pageId';

interface OpenPageParams {
  dragging    : boolean;
  reveals     : TaskReveal[];
  // Files dropped and their actions shown, not run yet (kept while collapsed).
  pending     : boolean;
  tasks       : Task[];
  // The section on screen when it collapsed, and when that was (null: never collapsed yet).
  current     : PageId;
  collapsedAt : number | null;
  now         : number;
  // After this long away, the last section is not worth going back to.
  lifetime    : number;
}

export const ownerOfAction = (actionId: string): PageId => ACTION_OWNERS[actionId] ?? DEFAULT_OWNER;

// A screen only shows its own tasks (Inicio never shows a Limpieza scan, for instance).
export const tasksForPage = (tasks: Task[], page: PageId): Task[] => tasks.filter((task) => task.owner === page);

// Of the tasks that finished with the island collapsed, the most recent one decides the screen.
export const pickRevealPage = (reveals: TaskReveal[]): PageId | null =>
  reveals.reduce<TaskReveal | null>((latest, reveal) => (!latest || reveal.finishedAt >= latest.finishedAt ? reveal : latest), null)?.owner ?? null;

// The screen shown when the island opens, in this order: a file being dragged → Inicio (where it is
// dropped); a finished task not seen yet → its owner; a pending file selection → Inicio; a task in
// progress → the owner of the most recent one; otherwise the last section, unless it collapsed too
// long ago (then Inicio).
export const pickOpenPage = ({ dragging, reveals, pending, tasks, current, collapsedAt, now, lifetime }: OpenPageParams): PageId => {
  if (dragging) return DEFAULT_OWNER;

  const revealed = pickRevealPage(reveals);
  if (revealed) return revealed;

  if (pending) return DEFAULT_OWNER;

  const active = tasks.filter((task) => task.status === 'running' || task.status === 'queued');
  const latest = active.reduce<Task | null>((best, task) => (!best || task.createdAt >= best.createdAt ? task : best), null);
  if (latest) return latest.owner;

  return collapsedAt !== null && now - collapsedAt > lifetime ? DEFAULT_OWNER : current;
};
