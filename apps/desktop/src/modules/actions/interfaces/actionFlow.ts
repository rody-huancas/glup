import type { ActionId } from '@/modules/actions/types/actionId';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import type { ImageFormat } from '@/modules/actions/types/imageFormat';
import type { IdChoice } from '@/modules/id-photo/interfaces/idChoice';
import type { IdCrop } from '@/modules/id-photo/interfaces/idCrop';
import type { BackgroundKind } from '@/modules/background/types/backgroundKind';
import type { LearnableId } from '@/modules/background/types/learnableId';
import type { NumberingOptions } from '@/modules/pdf/interfaces/numberingOptions';
import type { ReduceOptions } from '@/modules/pdf/interfaces/reduceOptions';
import type { WatermarkOptions } from '@/modules/pdf/interfaces/watermarkOptions';
import type { PageImageFormat } from '@/modules/pdf/types/pageImageFormat';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import type { TranscribeOptions } from '@/modules/transcribe/interfaces/transcribeOptions';
import type { VideoOptions } from '@/modules/video/interfaces/videoOptions';

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
  protectPdf       : (password: string) => void;
  // Resolves false when the password is not the right one.
  unlockPdf        : (password: string) => Promise<boolean>;
  watermarkPdf     : (options: WatermarkOptions) => void;
  numberPages      : (options: NumberingOptions) => void;
  reduceVideo      : (options: VideoOptions) => void;
  // "Foto tamaño carnet": the size chosen (what the preview frames) and the framing once "Listo".
  idChoice         : IdChoice | null;
  chooseIdFormat   : (choice: IdChoice) => void;
  saveIdPhoto      : (session: number, crop: IdCrop) => void;
  startTranscribe  : (options: TranscribeOptions) => void;
  // What the learning step downloads now.
  learnable        : LearnableId;
  // The learning step ("Quitar fondo" or videos): download started, stopped (cancel or error), finished.
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
