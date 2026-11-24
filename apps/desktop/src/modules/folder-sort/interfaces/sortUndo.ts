import type { UndoReport } from '@/modules/folder-sort/interfaces/undoReport';

// A "Deshacer" (from the result, the notice or the Historial): its task while it runs, its report after.
export interface SortUndo {
  id     : string;
  taskId : string | null;
  report : UndoReport | null;
}
