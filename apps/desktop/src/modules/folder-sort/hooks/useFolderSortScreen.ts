import { useEffect } from 'react';
import { useFolderSort } from '@/modules/folder-sort/hooks/useFolderSort';
import {
  cancelFolderSort,
  chooseSortFolder,
  chooseSortMode,
  loadDefaultFolder,
  resetFolderSort,
  reviewFolder,
  startSort,
  startUndo,
  toggleSortGroup,
  toggleSortSkipped,
} from '@/modules/folder-sort/store/folderSortStore';
import { useSeenTasks } from '@/modules/tasks/hooks/useSeenTasks';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { getTaskFraction } from '@/modules/tasks/utils/taskView';

// The page of "Ordenar una carpeta": the store keeps everything; here, the task running (a sort or an
// undo) for its progress and its Cancelar.
export const useFolderSortScreen = () => {
  const sort  = useFolderSort();
  const tasks = useTasks();
  const id    = sort.taskId ?? sort.undo?.taskId ?? null;
  const task  = id ? (tasks.find((item) => item.id === id) ?? null) : null;

  useSeenTasks('folder-sort');

  useEffect(() => {
    loadDefaultFolder();
  }, []);

  const undoId  = sort.report?.undoId ?? null;
  const undoing = sort.undo?.taskId != null;

  return {
    sort,
    undoing,
    working     : sort.phase === 'previewing' || sort.phase === 'sorting' || undoing,
    progress    : task ? getTaskFraction(task) : null,
    name        : task?.progress?.name ?? '',
    waiting     : task?.status === 'queued',
    cancelling  : task?.cancelling ?? false,
    canUndo     : undoId !== null && !sort.undone.has(undoId) && !undoing,
    undoneHere  : undoId !== null && sort.undone.has(undoId),
    undo        : () => undoId && startUndo(undoId),
    pick        : chooseSortFolder,
    chooseMode  : chooseSortMode,
    review      : reviewFolder,
    confirm     : startSort,
    cancel      : cancelFolderSort,
    again       : resetFolderSort,
    toggleGroup : toggleSortGroup,
    toggleSkip  : toggleSortSkipped,
  };
};
