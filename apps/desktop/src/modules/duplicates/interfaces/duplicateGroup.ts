import type { GroupKind } from '@/modules/duplicates/types/groupKind';

export interface GroupFile {
  path     : string;
  size     : number;
  modified : number;
}

// A group of the search: its copies, the one that would stay (exact copies), the ones marked to quit
// (only the clear ones) and what the others take.
export interface DuplicateGroup {
  id       : number;
  kind     : GroupKind;
  files    : GroupFile[];
  keep     : number | null;
  quit     : number[];
  // Copies in folders of their own with plain names: nothing marked, the person decides.
  review   : boolean;
  freeable : number;
}
