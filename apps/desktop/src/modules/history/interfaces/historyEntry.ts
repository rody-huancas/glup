import type { ActionId } from '@/modules/actions/types/actionId';
import type { SupportedFileType } from '@/modules/actions/types/fileType';

// Limpieza, Copiar texto de la pantalla and Ordenar una carpeta entries have no file (empty path).
export interface HistoryEntry {
  id     : string;
  name   : string;
  path   : string;
  // 'video' comes from SupportedFileType.
  type   : SupportedFileType | 'zip' | 'cleanup' | 'screen-text' | 'folder-sort' | 'duplicates' | 'batch-rename' | 'auto-trash';
  action : ActionId | 'cleanup' | 'screen-text' | 'folder-sort' | 'duplicates' | 'auto-trash';
  detail : string;
  date   : string;
  // What was copied from the screen, to see it and copy it again.
  text?  : string;
  // A sorted folder: the record to undo it, while it can still be undone.
  undo?    : string;
  // Bytes it saved (a reduced file, a cleaning) and seconds of audio passed to text: "Tu semana".
  saved?   : number;
  seconds? : number;
  // Carpetas automáticas: the rule that did it on its own.
  rule?    : string;
}
