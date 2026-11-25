import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { RENAME_TEXTS } from '@/modules/rename/constants/texts';
import type { ApplyReport, RenameOrder, RenameRow, RenameRule } from '@/modules/rename/interfaces/renameRule';
import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';
import { APPLY_RENAME, RENAME_FOLDER_FILES, RENAME_PREVIEW, UNDO_RENAME } from '@/shared/constants/events';

export interface RenameRequest {
  paths          : string[];
  rules          : RenameRule[];
  order          : RenameOrder;
  lowerExtension : boolean;
}

export const renamePreview = (request: RenameRequest): Promise<RenameRow[]> => invoke<RenameRow[]>(RENAME_PREVIEW, { request });

export const applyRename = (request: RenameRequest): Promise<ApplyReport> => invoke<ApplyReport>(APPLY_RENAME, { request });

export const undoRename = (id: string): Promise<TaskSummary> => invoke<TaskSummary>(UNDO_RENAME, { request: { id } });

export const pickRenameFiles = async (): Promise<string[]> => {
  const chosen = await open({ multiple: true, directory: false, title: RENAME_TEXTS.pickFiles });
  return Array.isArray(chosen) ? chosen : typeof chosen === 'string' ? [chosen] : [];
};

// A folder: its loose files.
export const pickRenameFolder = async (): Promise<string[]> => {
  const chosen = await open({ multiple: false, directory: true, title: RENAME_TEXTS.pickFolder });
  return typeof chosen === 'string' ? invoke<string[]>(RENAME_FOLDER_FILES, { folder: chosen }) : [];
};
