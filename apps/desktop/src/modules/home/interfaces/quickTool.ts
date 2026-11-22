import type { ActionId } from '@/modules/actions/types/actionId';
import type { SupportedFileType } from '@/modules/actions/types/fileType';

export interface QuickTool {
  id          : string;
  actionId    : ActionId;
  fileType    : SupportedFileType;
  title       : string;
  description : string;
  multiple    : boolean;
}
