import type { DockShifts } from '@/modules/dock/interfaces/dockShifts';
import type { DockEdge } from '@/modules/dock/types/dockEdge';
import type { DockKind } from '@/modules/dock/types/dockKind';
import type { IslandRest } from '@/modules/dock/types/islandRest';
import type { Rect } from '@/shared/interfaces/rect';

// Where the window goes and where the island is drawn inside it, for one dock. Every length is in CSS
// pixels: frame is relative to the work area of its screen, the rest to the window.
export interface IslandPlacement {
  edge   : DockEdge;
  kind   : DockKind;
  frame  : Rect;
  // Center of the pill along its edge (window coordinates; 0 for corners).
  along  : number;
  shifts : DockShifts;
  rest   : IslandRest;
}
