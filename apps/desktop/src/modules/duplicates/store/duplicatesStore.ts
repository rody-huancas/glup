import { DUPLICATES_TEXTS } from '@/modules/duplicates/constants/texts';
import type { DuplicateGroup } from '@/modules/duplicates/interfaces/duplicateGroup';
import type { DuplicatesState } from '@/modules/duplicates/interfaces/duplicatesState';
import { checkDuplicateFolder, getDuplicateDefaults, removeDuplicates, scanDuplicates } from '@/modules/duplicates/services/duplicates';
import { defaultMarks, keepOnly, keepsOneInEach, toggleMark } from '@/modules/duplicates/utils/selection';
import { cancelTask, enqueueTask } from '@/modules/tasks/store/taskStore';
import { summaryToResult } from '@/modules/tasks/utils/taskResult';

// Module-level, like Limpieza: a search or a quitting keeps going (and its result stays) when the island
// collapses or the page changes.
let state: DuplicatesState = {
  phase   : 'idle',
  folders : null,
  minSize : 10 * 1024,
  similar : false,
  scan    : null,
  marked  : new Set(),
  taskId  : null,
  report  : null,
  problem : null,
};
let loaded      = false;
const listeners = new Set<() => void>();

const setState = (change: Partial<DuplicatesState>) => {
  state = { ...state, ...change };
  listeners.forEach((listener) => listener());
};

const load = () => {
  if (loaded) return;
  loaded = true;
  void getDuplicateDefaults()
    .then((defaults) => setState({ folders: state.folders ?? defaults.folders, minSize: defaults.minSize }))
    .catch(() => setState({ folders: state.folders ?? [] }));
};

export const subscribeDuplicates = (listener: () => void): (() => void) => {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getDuplicates = (): DuplicatesState => state;

const idle = (): boolean => state.phase !== 'scanning' && state.phase !== 'removing';

export const addFolder = async (path: string) => {
  if (!idle()) return;
  const problem = await checkDuplicateFolder(path).catch(() => null);
  if (problem) return setState({ problem });
  const folders = state.folders ?? [];
  if (!folders.some((folder) => folder.toLowerCase() === path.toLowerCase())) setState({ folders: [...folders, path], problem: null });
};

export const removeFolder = (path: string) => idle() && setState({ folders: (state.folders ?? []).filter((folder) => folder !== path), problem: null });

export const setMinSize = (minSize: number) => idle() && setState({ minSize });

export const setSimilar = (similar: boolean) => idle() && setState({ similar });

// «Buscar repetidos»: a task in the shared queue (the pill shows the progress, a notice at the end).
export const startScan = () => {
  const folders = state.folders ?? [];
  if (!idle() || folders.length === 0) return;

  setState({ phase: 'scanning', scan: null, marked: new Set(), report: null, problem: null });
  const { minSize, similar } = state;

  const taskId = enqueueTask({
    title     : DUPLICATES_TEXTS.scanTask,
    type      : null,
    fileCount : 1,
    owner     : 'duplicates',
    run       : async ({ taskId: id }) => {
      try {
        const scan = await scanDuplicates({ folders, minSize, similar, taskId: id });
        setState({ phase: scan.groups.length > 0 ? 'ready' : 'idle', scan, marked: defaultMarks(scan.groups), taskId: null });
        return summaryToResult(scan.summary);
      } catch (error) {
        setState({ phase: 'idle', taskId: null });
        throw error;
      }
    },
  });
  setState({ taskId });
};

export const cancelCurrent = () => {
  if (state.taskId) cancelTask(state.taskId);
};

export const toggleFile = (group: DuplicateGroup, path: string) => {
  if (state.phase !== 'ready') return;
  const next = toggleMark({ group, path, marked: state.marked });
  if (next) setState({ marked: next });
};

export const keepFile = (group: DuplicateGroup, path: string) => {
  if (state.phase === 'ready') setState({ marked: keepOnly({ group, path, marked: state.marked }) });
};

// «Quitar», once confirmed: what is marked, never every copy of a group.
export const startRemove = () => {
  const groups = state.scan?.groups ?? [];
  const paths  = [...state.marked];
  if (state.phase !== 'ready' || paths.length === 0 || !keepsOneInEach(groups, state.marked)) return;

  setState({ phase: 'removing' });
  const taskId = enqueueTask({
    title     : DUPLICATES_TEXTS.removeTask,
    type      : null,
    fileCount : paths.length,
    owner     : 'duplicates',
    run       : async ({ taskId: id }) => {
      try {
        const report = await removeDuplicates({ paths, taskId: id });
        setState({ phase: 'done', report, scan: null, marked: new Set(), taskId: null });
        return summaryToResult(report.summary);
      } catch (error) {
        setState({ phase: 'ready', taskId: null });
        throw error;
      }
    },
  });
  setState({ taskId });
};

export const searchAgain = () => idle() && setState({ phase: 'idle', scan: null, report: null, marked: new Set() });
