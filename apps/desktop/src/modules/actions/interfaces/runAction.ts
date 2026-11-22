import type { ActionId } from '@/modules/actions/types/actionId';

export interface RunActionParams {
  actionId : ActionId;
  paths    : string[];
}
