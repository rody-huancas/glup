import { open } from '@tauri-apps/plugin-dialog';
import { DIALOG_FILTERS } from '@/modules/actions/constants/fileDialog';
import type { DialogFileType } from '@/modules/actions/types/fileType';

interface PickFilesParams {
  type     : DialogFileType;
  multiple : boolean;
}

export const pickFiles = async ({ type, multiple }: PickFilesParams): Promise<string[]> => {
  const result = await open({ multiple, directory: false, filters: DIALOG_FILTERS[type] });

  if (!result) return [];
  return Array.isArray(result) ? result : [result];
};
