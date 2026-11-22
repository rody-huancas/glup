import type { ActionId } from '@/modules/actions/types/actionId';
import type { SupportedFileType } from '@/modules/actions/types/fileType';

export interface HistoryEntry {
  id     : string;
  name   : string;
  type   : SupportedFileType;
  action : ActionId;
  detail : string;
  date   : string;
}
