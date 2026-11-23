import { listen } from '@tauri-apps/api/event';
import { CATEGORY_ORDER, RECYCLE_BIN_KEY } from '@/modules/cleanup/constants/categories';
import { CLEANUP_TEXTS } from '@/modules/cleanup/constants/texts';
import type { CleanupCategory } from '@/modules/cleanup/interfaces/cleanupCategory';
import type { CleanupState } from '@/modules/cleanup/interfaces/cleanupState';
import { cleanUp, scanCleanup } from '@/modules/cleanup/services/cleanup';
import type { CategoryId } from '@/modules/cleanup/types/categoryId';
import { isExpired } from '@/modules/cleanup/utils/expiry';
import { defaultSelection, selectedPaths, toggleCategory, toggleItem } from '@/modules/cleanup/utils/selection';
import { cancelTask, enqueueTask } from '@/modules/tasks/store/taskStore';
import { summaryToResult } from '@/modules/tasks/utils/taskResult';
import { CLEANUP_CATEGORY_EVENT } from '@/shared/constants/events';

// Module-level, like the task store: a scan or a cleaning keeps going (and its result stays) when the
// island collapses or the page changes.
let state: CleanupState = {
  phase      : 'idle',
  taskId     : null,
  categories : [],
  selected   : new Set(),
  report     : null,
  diskRead   : 0,
  expanded   : new Set(),
  scanTaskId : null,
  finishedAt : null,
  unseen     : false,
  expired    : false,
};
let started             = false;
// How many Limpieza pages are on screen (0 or 1): a result seen there leaves no dot.
let viewing             = 0;
const listeners         = new Set<() => void>();

const setState = (change: Partial<CleanupState>) => {
  state = { ...state, ...change };
  listeners.forEach((listener) => listener());
};

const ordered = (categories: CleanupCategory[]): CleanupCategory[] =>
  [...categories].sort((a, b) => CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id));

// Categories show up one by one while the scan runs, already marked if they are marked by default.
const start = () => {
  if (started) return;
  started = true;

  void listen<CleanupCategory>(CLEANUP_CATEGORY_EVENT, ({ payload }) => {
    if (state.phase !== 'scanning') return;

    const categories = ordered([...state.categories.filter((category) => category.id !== payload.id), payload]);
    const selected   = new Set([...state.selected, ...defaultSelection([payload])]);
    setState({ categories, selected });
  });
};

export const subscribeCleanup = (listener: () => void): (() => void) => {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getCleanup = (): CleanupState => state;

// "Revisar mi PC": a task in the shared queue (Glup works, the pill shows progress, a notice at the end).
export const startScan = () => {
  if (state.phase === 'scanning' || state.phase === 'cleaning') return;

  setState({ phase: 'scanning', categories: [], selected: new Set(), expanded: new Set(), report: null, taskId: null, finishedAt: null, expired: false, unseen: false });

  const taskId = enqueueTask({
    title     : CLEANUP_TEXTS.scanTask,
    type      : null,
    fileCount : 1,
    owner     : 'cleanup',
    run       : async ({ taskId: id }) => {
      try {
        const scan = await scanCleanup(id);
        const done = scan.categories.length > 0;

        setState({
          phase      : done ? 'ready' : 'idle',
          categories : ordered(scan.categories),
          selected   : defaultSelection(scan.categories),
          taskId     : null,
          finishedAt : Date.now(),
          unseen     : done && viewing === 0,
        });
        return summaryToResult(scan.summary);
      } catch (error) {
        setState({ phase: 'idle', taskId: null });
        throw error;
      }
    },
  });

  setState({ taskId, scanTaskId: taskId });
};

export const cancelCurrent = () => {
  if (state.taskId) cancelTask(state.taskId);
};

export const toggleCleanupCategory = (category: CleanupCategory) => {
  if (state.phase === 'ready') setState({ selected: toggleCategory(category, state.selected) });
};

export const toggleCleanupItem = (category: CleanupCategory, path: string) => {
  if (state.phase === 'ready') setState({ selected: toggleItem({ category, path, selected: state.selected }) });
};

// "Liberar", once confirmed.
export const startClean = () => {
  if (state.phase !== 'ready') return;

  const paths           = selectedPaths(state.categories, state.selected);
  const emptyRecycleBin = state.selected.has(RECYCLE_BIN_KEY);
  if (paths.length === 0 && !emptyRecycleBin) return;

  setState({ phase: 'cleaning', taskId: null });

  const taskId = enqueueTask({
    title     : CLEANUP_TEXTS.cleanTask,
    type      : null,
    fileCount : paths.length,
    owner     : 'cleanup',
    run       : async ({ taskId: id }) => {
      try {
        const report = await cleanUp({ paths, emptyRecycleBin, taskId: id });

        setState({ phase: 'done', report, taskId: null, categories: [], selected: new Set(), expanded: new Set(), finishedAt: null, diskRead: state.diskRead + 1 });
        return summaryToResult(report.summary);
      } catch (error) {
        setState({ phase: 'ready', taskId: null });
        throw error;
      }
    },
  });

  setState({ taskId });
};

// "Revisar de nuevo" from the result.
export const resetCleanup = () => {
  if (state.phase === 'done') setState({ phase: 'idle', report: null });
};

export const toggleCleanupExpanded = (id: CategoryId) => {
  const expanded = new Set(state.expanded);

  if (expanded.has(id)) expanded.delete(id);
  else expanded.add(id);

  setState({ expanded });
};

// The page tells when it is on screen; being there clears the dot.
export const setCleanupViewing = (on: boolean) => {
  viewing = Math.max(0, viewing + (on ? 1 : -1));
  if (on && state.unseen) setState({ unseen: false });
};

// After 30 minutes the files may have changed: the result is dropped and a new scan is offered.
export const expireCleanupResult = (now: number) => {
  if (state.phase !== 'ready' || !isExpired(state.finishedAt, now)) return;

  setState({ phase: 'idle', categories: [], selected: new Set(), expanded: new Set(), finishedAt: null, unseen: false, expired: true });
};
