import type { ActionId } from '@/modules/actions/types/actionId';
import type { ImageFormat } from '@/modules/actions/types/imageFormat';
import type { BackgroundKind } from '@/modules/background/types/backgroundKind';
import type { NumberingOptions } from '@/modules/pdf/interfaces/numberingOptions';
import type { ReduceOptions } from '@/modules/pdf/interfaces/reduceOptions';
import type { SplitOptions } from '@/modules/pdf/interfaces/splitOptions';
import type { WatermarkOptions } from '@/modules/pdf/interfaces/watermarkOptions';
import type { JpgQuality } from '@/modules/photos/types/jpgQuality';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import type { VideoOptions } from '@/modules/video/interfaces/videoOptions';

export interface RunActionOptions {
  format?      : ImageFormat;
  destination? : SaveDestination;
  bundle?      : boolean;
  split?       : SplitOptions;
  reduce?      : ReduceOptions;
  background?  : BackgroundKind;
  // Only for "Poner contraseña" and "Quitar contraseña"; Rust never stores it.
  password?    : string;
  watermark?   : WatermarkOptions;
  numbering?   : NumberingOptions;
  video?       : VideoOptions;
  jpg?         : JpgQuality;
}

export interface RunActionParams {
  actionId : ActionId;
  paths    : string[];
  options? : RunActionOptions;
  taskId?  : string;
}
