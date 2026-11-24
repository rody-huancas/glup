import { FOLDER_SORT_TEXTS } from '@/modules/folder-sort/constants/texts';
import type { FolderSortState } from '@/modules/folder-sort/interfaces/folderSortState';
import { getSortFolder, pickSortFolder, previewFolderSort, sortFolder, undoFolderSort } from '@/modules/folder-sort/services/folderSort';
import type { SortMode } from '@/modules/folder-sort/types/sortMode';
import { cancelTask, enqueueTask } from '@/modules/tasks/store/taskStore';
import { summaryToResult } from '@/modules/tasks/utils/taskResult';

// Module-level, like Limpieza: a sort or an undo keeps going (and its result stays) when the island
// collapses or the page changes. "Deshacer" also comes from the notice and the Historial.
let state: FolderSortState = {
  phase       : 'idle',
  folder      : null,
  mode        : 'type',
  preview     : null,
  report      : null,
  error       : null,
  taskId      : null,
  undo        : null,
  undone      : new Set(),
  expanded    : new Set(),
  showSkipped : false,
};
let asked       = false;
const listeners = new Set<() => void>();

const setState = (change: Partial<FolderSortState>) => {
  state = { ...state, ...change };
  listeners.forEach((listener) => listener());
};

export const subscribeFolderSort = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getFolderSort = (): FolderSortState => state;

const working = (): boolean => state.phase === 'previewing' || state.phase === 'sorting' || state.undo?.taskId != null;

// Descargas, asked once.
export const loadDefaultFolder = () => {
  if (asked || state.folder) return;
  asked = true;
  void getSortFolder().then((folder) => !state.folder && setState({ folder })).catch(() => undefined);
};

const clearPreview = (): Partial<FolderSortState> => ({ phase: 'idle', preview: null, report: null, error: null, expanded: new Set(), showSkipped: false });

export const chooseSortFolder = () => {
  if (working()) return;
  void pickSortFolder(state.folder).then((folder) => folder && setState({ folder, ...clearPreview() })).catch(() => undefined);
};

// "Revisar la carpeta": the preview, nothing moves.
export const reviewFolder = () => {
  const folder = state.folder;
  if (!folder || working()) return;

  setState({ phase: 'previewing', preview: null, report: null, error: null, expanded: new Set(), showSkipped: false });

  void previewFolderSort({ folder, mode: state.mode })
    .then((preview) => setState({ phase: 'ready', preview }))
    .catch(() => setState({ phase: 'idle', error: FOLDER_SORT_TEXTS.failed }));
};

// Another way of sorting needs another preview.
export const chooseSortMode = (mode: SortMode) => {
  if (mode === state.mode || working()) return;

  const reviewed = state.phase === 'ready';
  setState({ mode, ...clearPreview() });
  if (reviewed) reviewFolder();
};

// "Ordenar": the only thing that moves files.
export const startSort = () => {
  const preview = state.preview;
  if (state.phase !== 'ready' || !preview || preview.count === 0) return;

  setState({ phase: 'sorting', taskId: null });

  const taskId = enqueueTask({
    title     : FOLDER_SORT_TEXTS.sortTask,
    type      : null,
    fileCount : preview.count,
    owner     : 'folder-sort',
    run       : async ({ taskId: id }) => {
      try {
        const report = await sortFolder(id);
        setState({ phase: 'done', report, taskId: null, preview: null, expanded: new Set() });
        return { ...summaryToResult(report.summary), undoId: report.undoId ?? undefined };
      } catch (error) {
        setState({ phase: 'idle', taskId: null, preview: null });
        throw error;
      }
    },
  });

  setState({ taskId });
};

// From the result, the notice or the Historial; one at a time.
export const startUndo = (id: string) => {
  if (state.undo?.taskId || state.undone.has(id)) return;

  setState({ undo: { id, taskId: null, report: null } });

  const taskId = enqueueTask({
    title     : FOLDER_SORT_TEXTS.undoTask,
    type      : null,
    fileCount : 1,
    owner     : 'folder-sort',
    run       : async ({ taskId: task }) => {
      try {
        const report = await undoFolderSort({ id, taskId: task });
        const undone = report.pending ? state.undone : new Set([...state.undone, id]);
        setState({ undo: { id, taskId: null, report }, undone });
        return summaryToResult(report.summary);
      } catch (error) {
        setState({ undo: null });
        throw error;
      }
    },
  });

  setState({ undo: { id, taskId, report: null } });
};

export const cancelFolderSort = () => {
  const taskId = state.taskId ?? state.undo?.taskId;
  if (taskId) cancelTask(taskId);
};

// "Ordenar otra vez".
export const resetFolderSort = () => {
  if (!working()) setState({ ...clearPreview(), undo: null });
};

export const toggleSortGroup = (folder: string) => {
  const expanded = new Set(state.expanded);

  if (expanded.has(folder)) expanded.delete(folder);
  else expanded.add(folder);

  setState({ expanded });
};

export const toggleSortSkipped = () => setState({ showSkipped: !state.showSkipped });
