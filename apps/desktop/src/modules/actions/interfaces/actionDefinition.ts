import type { ActionId } from '@/modules/actions/types/actionId';
import type { FileCount } from '@/modules/actions/types/fileCount';
import type { SupportedFileType } from '@/modules/actions/types/fileType';

export interface ActionDefinition {
  id        : ActionId;
  label     : string;
  fileType  : SupportedFileType;
  fileCount : FileCount;
  primary   : boolean;
}
