import type { ActionId } from '@/modules/actions/types/actionId';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import type { ImageFormat } from '@/modules/actions/types/imageFormat';
import type { BackgroundKind } from '@/modules/background/types/backgroundKind';
import type { ReduceOptions } from '@/modules/pdf/interfaces/reduceOptions';
import type { PageImageFormat } from '@/modules/pdf/types/pageImageFormat';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';

// Everything the actions panel needs to show a step and react to it. Progress and results moved to
// the task store (TaskCard).
export interface ActionFlow {
  phase            : ActionsPhase;
  saveLocation     : SaveLocation;
  choose           : (actionId: ActionId) => void;
  chooseFormat     : (format: ImageFormat) => void;
  merge            : (paths: string[]) => void;
  splitAll         : () => void;
  pickPages        : () => void;
  splitPages       : (pages: number[]) => void;
  toImages         : (format: PageImageFormat) => void;
  reducePdf        : (options: ReduceOptions) => void;
  chooseBackground : (background: BackgroundKind) => void;
  // The "Quitar fondo" learning step: download started, stopped (cancel or error), finished.
  modelStarted     : () => void;
  modelStopped     : () => void;
  modelReady       : () => void;
  back             : () => void;
  close            : () => void;
  // progress     : ActionProgress | null;
  // result       : ActionResult | null;
  // running      : boolean;
  // cancelling   : boolean;
  // cancel       : () => void;
  // openOutput   : () => void;
  // revealOutput : () => void;
}
