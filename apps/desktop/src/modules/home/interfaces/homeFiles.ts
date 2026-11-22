import type { RefObject } from 'react';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import type { MascotState } from '@/modules/mascot/types/mascotState';

export interface HomeFiles {
  dragging                : boolean;
  notice                  : string | null;
  selection               : FileSelection | null;
  phase                   : ActionsPhase;
  busy                    : boolean;
  dropMascotRef           : RefObject<MascotController | null>;
  onDropMascotStateChange : (state: MascotState) => void;
  choose                  : (actionId: ActionId) => void;
  close                   : () => void;
  pickFiles               : () => void;
}
