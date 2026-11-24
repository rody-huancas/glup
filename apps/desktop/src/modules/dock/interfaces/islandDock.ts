import type { DockEdge } from '@/modules/dock/types/dockEdge';

// Where the island lives, as settings.json keeps it: the edge, how far along it (0 to 1; corners ignore
// it) and the screen (null: the main one).
export interface IslandDock {
  edge   : DockEdge;
  offset : number;
  screen : string | null;
}
