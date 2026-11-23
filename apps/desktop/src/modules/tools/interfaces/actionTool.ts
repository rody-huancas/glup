import type { ActionId } from '@/modules/actions/types/actionId';
import type { DialogFileType } from '@/modules/actions/types/fileType';
import type { ToolBase } from '@/modules/tools/interfaces/toolBase';

// Asks for files and goes through the drop flow. With a quickTitle it also shows in Inicio, under that name.
export interface ActionTool extends ToolBase {
  kind        : 'action';
  actionId    : ActionId;
  fileType    : DialogFileType;
  multiple    : boolean;
  quickTitle? : string;
}
