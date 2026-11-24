import type { SortPreview } from '@/modules/folder-sort/interfaces/sortPreview';
import type { SortReport } from '@/modules/folder-sort/interfaces/sortReport';
import type { SortUndo } from '@/modules/folder-sort/interfaces/sortUndo';
import type { FolderSortPhase } from '@/modules/folder-sort/types/folderSortPhase';
import type { SortMode } from '@/modules/folder-sort/types/sortMode';

export interface FolderSortState {
  phase       : FolderSortPhase;
  // Descargas until another one is chosen (null while it is read, or if Windows does not tell it).
  folder      : string | null;
  mode        : SortMode;
  preview     : SortPreview | null;
  report      : SortReport | null;
  error       : string | null;
  taskId      : string | null;
  undo        : SortUndo | null;
  // Undone records: their "Deshacer" is gone.
  undone      : Set<string>;
  expanded    : Set<string>;
  showSkipped : boolean;
}
