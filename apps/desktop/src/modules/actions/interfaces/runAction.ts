import type { ActionId } from '@/modules/actions/types/actionId';
import type { ImageFormat } from '@/modules/actions/types/imageFormat';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';

export interface RunActionOptions {
  format?      : ImageFormat;
  destination? : SaveDestination;
  bundle?      : boolean;
}

export interface RunActionParams {
  actionId : ActionId;
  paths    : string[];
  options? : RunActionOptions;
}
