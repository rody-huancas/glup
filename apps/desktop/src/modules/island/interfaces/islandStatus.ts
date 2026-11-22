import type { WindowSize } from '@/modules/island/interfaces/islandLayout';

// The real window as Rust sees it (get_island_status).
export interface IslandStatus {
  visible    : boolean;
  fullscreen : boolean;
  trayHidden : boolean;
  area       : WindowSize;
}
