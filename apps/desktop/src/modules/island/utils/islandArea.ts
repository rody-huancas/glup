import { DEFAULT_DOCK, FALLBACK_WORK } from '@/modules/dock/constants/dock';
import type { DockArea } from '@/modules/dock/types/dockArea';
import { dockRegion } from '@/modules/dock/utils/dockLayout';
import { placeIsland } from '@/modules/dock/utils/placement';
import type { ShapeSize } from '@/modules/island/interfaces/islandShape';

// The machine's rules (the region never smaller than the pill…) are the same on every edge, so they are
// checked on the island of always: on top in the middle. The real regions come from dockRegion.
const CANONICAL = placeIsland({ dock: DEFAULT_DOCK, work: FALLBACK_WORK });

export const getIslandArea = (kind: DockArea): ShapeSize => {
  const { width, height } = dockRegion(CANONICAL, kind);
  return { width, height };
};
