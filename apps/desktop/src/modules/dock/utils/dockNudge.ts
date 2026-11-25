import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import type { DockEdge } from '@/modules/dock/types/dockEdge';

// How far one arrow press moves Glup along its edge (Shift: ten times more).
export const NUDGE_STEP = 0.02;
export const BIG_NUDGE  = 0.1;

import { DOCK_EDGE_NAMES } from '@/modules/dock/constants/texts';

// A corner has no place along an edge.
export const isCorner = (edge: DockEdge): boolean => edge.includes('-');

// "Posición en el borde", 0 to 100.
export const offsetPercent = (dock: IslandDock): number => Math.round(dock.offset * 100);

export const withOffset = (dock: IslandDock, percent: number): IslandDock => ({ ...dock, offset: Math.min(1, Math.max(0, percent / 100)) });

// Under the drawing while it moves: "Arriba · 35 %", or the corner's name.
export const dockLabel = (dock: IslandDock): string =>
  isCorner(dock.edge) ? DOCK_EDGE_NAMES[dock.edge] : `${DOCK_EDGE_NAMES[dock.edge]} · ${offsetPercent(dock)} %`;

interface NudgeParams {
  dock : IslandDock;
  key  : string;
  big  : boolean;
}

// The arrows along the edge: left and right on top or bottom, up and down on a side. Anything else (or a
// corner) leaves it where it is: null.
export const nudgeDock = ({ dock, key, big }: NudgeParams): IslandDock | null => {
  if (isCorner(dock.edge)) return null;

  const horizontal = dock.edge === 'top' || dock.edge === 'bottom';
  const back       = horizontal ? 'ArrowLeft' : 'ArrowUp';
  const forward    = horizontal ? 'ArrowRight' : 'ArrowDown';
  if (key !== back && key !== forward) return null;

  const step   = (big ? BIG_NUDGE : NUDGE_STEP) * (key === forward ? 1 : -1);
  const offset = Math.min(1, Math.max(0, Math.round((dock.offset + step) * 1000) / 1000));
  return offset === dock.offset ? null : { ...dock, offset };
};
