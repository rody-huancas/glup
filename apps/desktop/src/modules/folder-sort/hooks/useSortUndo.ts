import { useFolderSort } from '@/modules/folder-sort/hooks/useFolderSort';
import { startUndo } from '@/modules/folder-sort/store/folderSortStore';

// "Deshacer" outside the page (the notice, the Historial): whether one is running and how to start it.
export const useSortUndo = () => {
  const sort = useFolderSort();

  return {
    running : sort.undo?.taskId != null,
    undo    : startUndo,
  };
};
