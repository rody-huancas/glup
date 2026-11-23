import type { ActionId } from '@/modules/actions/types/actionId';
import type { SupportedFileType } from '@/modules/actions/types/fileType';

// Limpieza entries have no file (empty path).
export interface HistoryEntry {
  id     : string;
  name   : string;
  path   : string;
  // 'video' comes from SupportedFileType.
  type   : SupportedFileType | 'zip' | 'cleanup';
  action : ActionId | 'cleanup';
  // type   : SupportedFileType | 'zip';
  // action : ActionId;
  detail : string;
  date   : string;
}
