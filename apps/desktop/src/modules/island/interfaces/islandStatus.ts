import type { Rect } from '@/shared/interfaces/rect';

// The real window as Rust sees it (get_island_status).
export interface IslandStatus {
  visible    : boolean;
  fullscreen : boolean;
  trayHidden : boolean;
  capturing  : boolean;
  area       : Rect;
  // Rust follows a drag of the pill right now.
  dragging   : boolean;
}
