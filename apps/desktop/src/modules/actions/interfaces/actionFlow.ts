import type { ActionProgress } from '@/modules/actions/interfaces/actionReport';
import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import type { ActionId } from '@/modules/actions/types/actionId';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import type { ImageFormat } from '@/modules/actions/types/imageFormat';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';

// Everything the actions panel needs to show a step and react to it.
export interface ActionFlow {
  phase        : ActionsPhase;
  progress     : ActionProgress | null;
  result       : ActionResult | null;
  running      : boolean;
  cancelling   : boolean;
  saveLocation : SaveLocation;
  choose       : (actionId: ActionId) => void;
  chooseFormat : (format: ImageFormat) => void;
  back         : () => void;
  cancel       : () => void;
  openOutput   : () => void;
  revealOutput : () => void;
  close        : () => void;
}
