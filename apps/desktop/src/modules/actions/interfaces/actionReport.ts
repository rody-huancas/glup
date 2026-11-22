import type { ActionId } from '@/modules/actions/types/actionId';

export interface FileOutcome {
  source     : string;
  output     : string | null;
  sizeBefore : number;
  sizeAfter  : number | null;
  error      : string | null;
  unchanged  : string | null;
  // "Lo más que pude: 2,4 MB" when the size limit was not reached.
  note       : string | null;
}

export interface ActionReport {
  actionId   : ActionId;
  outcomes   : FileOutcome[];
  output     : string | null;
  outputSize : number | null;
  total      : number;
  cancelled  : boolean;
  bundled        : boolean;
  outputIsFolder : boolean;
  pagesDone      : number | null;
  pagesTotal     : number | null;
}

export interface ActionProgress {
  taskId? : string | null;
  current : number;
  total   : number;
  name    : string;
  active  : number;
  // Replaces "N de M" when the progress is not counted in files ("12 MB de 109 MB").
  detail? : string | null;
}
