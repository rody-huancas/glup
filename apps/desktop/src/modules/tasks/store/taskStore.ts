import { listen } from '@tauri-apps/api/event';
import { ACTIONS } from '@/modules/actions/constants/actions';
import type { ActionProgress } from '@/modules/actions/interfaces/actionReport';
import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import { cancelAction } from '@/modules/actions/services/runAction';
import { failedResult, summarizeReport } from '@/modules/actions/utils/result';
import { TASK_TEXTS } from '@/modules/tasks/constants/tasks';
import type { Task } from '@/modules/tasks/interfaces/task';
import type { TaskRecord } from '@/modules/tasks/interfaces/taskRecord';
import type { TaskSpec } from '@/modules/tasks/interfaces/taskSpec';
import { dismissTask, getActiveTasks } from '@/modules/tasks/services/tasks';
import { ACTION_PROGRESS_EVENT, TASK_FINISHED_EVENT } from '@/shared/constants/events';

// Module-level store, independent of React and of the island: tasks keep running and their results
// stay here whatever happens to the panel. One task runs at a time; the rest wait in order.
let tasks: Task[]  = [];
let started        = false;
const listeners    = new Set<() => void>();
const specs        = new Map<string, TaskSpec>();
const cancelled    = new Set<string>();

const emit = () => listeners.forEach((listener) => listener());

const setTasks = (next: Task[]) => {
  tasks = next;
  emit();
};

const update = (id: string, change: Partial<Task>) => setTasks(tasks.map((task) => (task.id === id ? { ...task, ...change } : task)));

const find = (id: string): Task | undefined => tasks.find((task) => task.id === id);

const createId = (): string => `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const finish = (id: string, result: ActionResult) => {
  if (find(id)?.status !== 'running') return;

  update(id, { status: 'done', result, progress: null, cancelling: false });
  specs.delete(id);
  cancelled.delete(id);
  pump();
};

// Starts the next queued task when nothing is running.
const pump = () => {
  if (tasks.some((task) => task.status === 'running')) return;

  const next = tasks.find((task) => task.status === 'queued');
  const spec = next ? specs.get(next.id) : undefined;
  if (!next || !spec) return;

  update(next.id, { status: 'running' });

  void spec
    .run({
      taskId      : next.id,
      onProgress  : (progress) => update(next.id, { progress }),
      isCancelled : () => cancelled.has(next.id),
    })
    .then(summarizeReport)
    .catch((error: unknown) => failedResult(String(error)))
    .then((result) => finish(next.id, result));
};

const resultOf = (record: TaskRecord): ActionResult | null => {
  if (record.report) return summarizeReport(record.report);
  return record.error ? failedResult(record.error) : null;
};

const titleOf = (record: TaskRecord): string =>
  ACTIONS.find((action) => action.id === record.actionId)?.label ?? TASK_TEXTS.restored;

// After a reload, tasks Rust still knows about come back (running ones finish through the event).
const restore = async () => {
  const records = await getActiveTasks().catch((): TaskRecord[] => []);
  const missing = records.filter((record) => !find(record.id));

  if (missing.length === 0) return;

  setTasks([
    ...tasks,
    ...missing.map((record): Task => ({
      id         : record.id,
      title      : titleOf(record),
      type       : null,
      fileCount  : record.report?.total ?? 1,
      status     : record.finished ? 'done' : 'running',
      progress   : record.progress,
      result     : record.finished ? resultOf(record) : null,
      cancelling : false,
    })),
  ]);
};

const start = () => {
  if (started) return;
  started = true;

  void listen<ActionProgress>(ACTION_PROGRESS_EVENT, ({ payload }) => {
    if (payload.taskId && find(payload.taskId)?.status === 'running') update(payload.taskId, { progress: payload });
  });

  // Covers tasks without a local promise (restored after a reload); the others finish through their promise.
  void listen<TaskRecord>(TASK_FINISHED_EVENT, ({ payload }) => {
    const result = resultOf(payload);
    if (result && !specs.has(payload.id)) finish(payload.id, result);
  });

  void restore();
};

export const subscribeTasks = (listener: () => void): (() => void) => {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getTasks = (): Task[] => tasks;

export const enqueueTask = (spec: TaskSpec): string => {
  const id = createId();

  specs.set(id, spec);
  setTasks([
    ...tasks,
    { id, title: spec.title, type: spec.type, fileCount: spec.fileCount, status: 'queued', progress: null, result: null, cancelling: false },
  ]);

  pump();
  return id;
};

// A queued task just leaves the line; a running one stops between files.
export const cancelTask = (id: string) => {
  const task = find(id);
  if (!task) return;

  if (task.status === 'queued') {
    specs.delete(id);
    setTasks(tasks.filter((item) => item.id !== id));
    return;
  }

  if (task.status === 'running' && !task.cancelling) {
    cancelled.add(id);
    update(id, { cancelling: true });
    void cancelAction();
  }
};

// Closing a result (x or Volver) is the only way it goes away.
export const dismissTaskResult = (id: string) => {
  if (find(id)?.status !== 'done') return;

  setTasks(tasks.filter((task) => task.id !== id));
  void dismissTask(id).catch(() => undefined);
};
