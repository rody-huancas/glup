import type { PageId } from '@/modules/main-window/types/pageId';

// A suggestion of Glup in Inicio: what it says, where its button goes, and the key it is closed by
// (it changes with what it says, so a changed one shows again).
export interface Suggestion {
  key    : string;
  text   : string;
  action : string;
  page   : PageId;
}
