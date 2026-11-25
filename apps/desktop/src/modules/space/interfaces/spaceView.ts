import type { SpaceKind } from '@/modules/space/types/spaceKind';

export interface SpaceItem {
  id    : number;
  name  : string;
  size  : number;
  dir   : boolean;
  kind  : SpaceKind;
  files   : number;
  path    : string;
  // How much of it is its kind (0 to 1): the strength of its colour.
  share   : number;
  // What it is in plain words, when it is a known file or folder.
  note    : string | null;
  // Why it cannot go to the bin (null: it can).
  blocked : string | null;
}

export interface SpaceTotals {
  files      : number;
  bytes      : number;
  cloudFiles : number;
  cloudBytes : number;
  denied     : number;
  links      : number;
  hardLinks  : number;
  done       : boolean;
  cancelled  : boolean;
  seconds    : number;
}

// One folder of what was analyzed (SpaceView in services/space).
export interface SpaceView {
  folder   : SpaceItem;
  crumbs   : SpaceItem[];
  children : SpaceItem[];
  rest     : [number, number] | null;
  kinds    : { kind: SpaceKind; size: number }[];
  biggest  : SpaceItem[];
  totals   : SpaceTotals;
}

export interface SpacePlace {
  path  : string;
  label : string;
  free  : number;
  total : number;
}
