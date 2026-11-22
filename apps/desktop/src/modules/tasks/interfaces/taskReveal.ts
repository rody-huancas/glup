import type { PageId } from '@/modules/main-window/types/pageId';

// A task that finished with the island collapsed: its owner screen opens on the next opening.
export interface TaskReveal {
  owner      : PageId;
  finishedAt : number;
}
