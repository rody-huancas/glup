import type { ActionId } from '@/modules/actions/types/actionId';
import type { ImageFormat } from '@/modules/actions/types/imageFormat';
import type { BackgroundKind } from '@/modules/background/types/backgroundKind';
import type { ReduceOptions } from '@/modules/pdf/interfaces/reduceOptions';
import type { SplitOptions } from '@/modules/pdf/interfaces/splitOptions';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';

export interface RunActionOptions {
  format?      : ImageFormat;
  destination? : SaveDestination;
  bundle?      : boolean;
  split?       : SplitOptions;
  reduce?      : ReduceOptions;
  background?  : BackgroundKind;
}

export interface RunActionParams {
  actionId : ActionId;
  paths    : string[];
  options? : RunActionOptions;
  taskId?  : string;
}
