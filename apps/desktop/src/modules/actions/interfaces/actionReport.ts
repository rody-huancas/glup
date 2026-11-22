import type { ActionId } from '@/modules/actions/types/actionId';

export interface FileOutcome {
  source     : string;
  output     : string | null;
  sizeBefore : number;
  sizeAfter  : number | null;
  error      : string | null;
  unchanged  : string | null;
}

export interface ActionReport {
  actionId   : ActionId;
  outcomes   : FileOutcome[];
  output     : string | null;
  outputSize : number | null;
  total      : number;
  cancelled  : boolean;
  bundled    : boolean;
}

export interface ActionProgress {
  current : number;
  total   : number;
  name    : string;
  active  : number;
}
