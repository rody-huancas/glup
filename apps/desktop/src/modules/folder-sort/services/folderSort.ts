import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FOLDER_SORT_TEXTS } from '@/modules/folder-sort/constants/texts';
import type { SortPreview } from '@/modules/folder-sort/interfaces/sortPreview';
import type { SortReport } from '@/modules/folder-sort/interfaces/sortReport';
import type { UndoReport } from '@/modules/folder-sort/interfaces/undoReport';
import type { SortMode } from '@/modules/folder-sort/types/sortMode';
import { GET_SORT_FOLDER, PREVIEW_FOLDER_SORT, SORT_FOLDER, UNDO_FOLDER_SORT } from '@/shared/constants/events';

interface PreviewParams {
  folder : string;
  mode   : SortMode;
}

interface UndoParams {
  id     : string;
  taskId : string;
}

// Descargas, proposed by default.
export const getSortFolder = (): Promise<string | null> => invoke<string | null>(GET_SORT_FOLDER);

export const pickSortFolder = async (current: string | null): Promise<string | null> => {
  const result = await open({ directory: true, multiple: false, title: FOLDER_SORT_TEXTS.pickTitle, defaultPath: current ?? undefined });
  return typeof result === 'string' ? result : null;
};

// Only looks: nothing moves until sortFolder.
export const previewFolderSort = ({ folder, mode }: PreviewParams): Promise<SortPreview> =>
  invoke<SortPreview>(PREVIEW_FOLDER_SORT, { request: { folder, mode } });

// Moves what the last preview showed.
export const sortFolder = (taskId: string): Promise<SortReport> => invoke<SortReport>(SORT_FOLDER, { request: { taskId } });

export const undoFolderSort = ({ id, taskId }: UndoParams): Promise<UndoReport> => invoke<UndoReport>(UNDO_FOLDER_SORT, { request: { id, taskId } });
