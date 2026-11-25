import type { RefObject } from 'react';
import type { ActionFlow } from '@/modules/actions/interfaces/actionFlow';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import type { PendingSelection } from '@/modules/actions/interfaces/pendingSelection';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import type { DialogFileType } from '@/modules/actions/types/fileType';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import type { ActionTool } from '@/modules/tools/interfaces/actionTool';

export interface HomeFiles {
  dragging                : boolean;
  notice                  : string | null;
  selection               : FileSelection | null;
  loading                 : PendingSelection | null;
  slow                    : boolean;
  saveLocation            : SaveLocation;
  phase                   : ActionsPhase;
  flow                    : ActionFlow;
  busy                    : boolean;
  dropMascotRef           : RefObject<MascotController | null>;
  onDropMascotStateChange : (state: MascotState) => void;
  choose                  : (actionId: ActionId) => void;
  close                   : () => void;
  pickFiles               : () => void;
  // «Elegir archivos» of a family: only its kinds in the dialog.
  pickFilesOf             : (type: DialogFileType) => void;
  runTool                 : (tool: ActionTool) => Promise<boolean>;
  // Files from the Explorer, with the option chosen there (or none); true when that action was chosen.
  openWith                : (params: { paths: string[]; actionId: ActionId | null }) => Promise<boolean>;
}
