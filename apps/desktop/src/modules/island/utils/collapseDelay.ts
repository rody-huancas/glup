import { ISLAND_TIMING } from '@/modules/island/constants/island';
import type { IslandState } from '@/modules/island/types/islandState';

interface ToggleDelayParams {
  state    : IslandState;
  inside   : boolean;
  dragging : boolean;
  blocked  : boolean;
  // Hidden at rest, the cursor rests against the edge this long (ms, from Ajustes) before Glup comes out.
  reveal?  : number | null;
}

// Returns how long to wait before toggling the island, or null when it must stay as is.
export const getToggleDelay = ({ state, inside, dragging, blocked, reveal = null }: ToggleDelayParams): number | null => {
  if (state === 'collapsed' && dragging) return ISLAND_TIMING.dragDwell;
  if (state === 'collapsed') return inside ? (reveal ?? ISLAND_TIMING.dwell) : null;
  if (state === 'expanded' && !inside && !blocked) return ISLAND_TIMING.leaveDelay;
  return null;
};
