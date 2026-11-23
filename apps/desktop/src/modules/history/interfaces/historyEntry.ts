import type { ActionId } from '@/modules/actions/types/actionId';
import type { SupportedFileType } from '@/modules/actions/types/fileType';

// Limpieza and Copiar texto de la pantalla entries have no file (empty path).
export interface HistoryEntry {
  id     : string;
  name   : string;
  path   : string;
  // 'video' comes from SupportedFileType.
  type   : SupportedFileType | 'zip' | 'cleanup' | 'screen-text';
  action : ActionId | 'cleanup' | 'screen-text';
  detail : string;
  date   : string;
  // What was copied from the screen, to see it and copy it again.
  text?  : string;
}
