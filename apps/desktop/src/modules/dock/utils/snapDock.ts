import { CORNER_ZONE, DEFAULT_DOCK, DOCK_EDGES } from '@/modules/dock/constants/dock';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import type { IslandScreen } from '@/modules/dock/interfaces/islandScreen';
import type { DockEdge } from '@/modules/dock/types/dockEdge';
import { offsetAt } from '@/modules/dock/utils/placement';
import type { Point } from '@/shared/interfaces/point';
import type { Rect } from '@/shared/interfaces/rect';
import type { Size } from '@/shared/interfaces/size';

interface SnapDockParams {
  // The cursor, in physical pixels of the desktop.
  point   : Point;
  screens : IslandScreen[];
}

interface ResolvedDock {
  dock   : IslandDock;
  screen : IslandScreen;
}

const contains = (rect: Rect, { x, y }: Point): boolean => x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;

const distanceTo = (rect: Rect, { x, y }: Point): number => {
  const dx = Math.max(rect.x - x, 0, x - (rect.x + rect.width));
  const dy = Math.max(rect.y - y, 0, y - (rect.y + rect.height));
  return Math.hypot(dx, dy);
};

// The work area of a screen in CSS pixels (what the island is laid out in).
export const workSize = (screen: IslandScreen): Size => ({ width: screen.work.width / screen.scale, height: screen.work.height / screen.scale });

// A point of a work area (CSS pixels) to the dock it means: a corner when it is near two edges, if not
// the nearest edge, at that spot along it. Also used by the drawing of Ajustes.
export const dockAt = (point: Point, work: Size, screen: string | null): IslandDock => {
  const x = Math.min(Math.max(point.x, 0), work.width);
  const y = Math.min(Math.max(point.y, 0), work.height);

  const nearLeft   = x < CORNER_ZONE;
  const nearRight  = work.width - x < CORNER_ZONE;
  const nearTop    = y < CORNER_ZONE;
  const nearBottom = work.height - y < CORNER_ZONE;

  if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
    const vertical   = nearTop && (!nearBottom || y <= work.height - y) ? 'top' : 'bottom';
    const horizontal = nearLeft && (!nearRight || x <= work.width - x) ? 'left' : 'right';
    return { edge: `${vertical}-${horizontal}` as DockEdge, offset: 0, screen };
  }

  const distances: [DockEdge, number][] = [['top', y], ['bottom', work.height - y], ['left', x], ['right', work.width - x]];
  const [edge]                          = distances.reduce((best, current) => (current[1] < best[1] ? current : best));
  const along                           = edge === 'top' || edge === 'bottom' ? x : y;
  const length                          = edge === 'top' || edge === 'bottom' ? work.width : work.height;

  return { edge, offset: offsetAt(edge, along, length), screen };
};

// Where the dragged island lands: on the screen under the cursor (or the nearest one), at its nearest
// edge or corner.
export const snapDock = ({ point, screens }: SnapDockParams): IslandDock | null => {
  const screen = screens.find((candidate) => contains(candidate.bounds, point))
    ?? [...screens].sort((a, b) => distanceTo(a.bounds, point) - distanceTo(b.bounds, point))[0];
  if (!screen) return null;

  const local = { x: (point.x - screen.work.x) / screen.scale, y: (point.y - screen.work.y) / screen.scale };
  return dockAt(local, workSize(screen), screen.id);
};

// The same place within a hair (a fraction of a pixel along the edge).
export const sameDock = (a: IslandDock, b: IslandDock): boolean => a.edge === b.edge && a.screen === b.screen && Math.abs(a.offset - b.offset) < 0.0005;

// The saved dock on the screens there are now. A screen that is gone (unplugged, renamed) gives way to
// the main one, at the same edge and the same relative spot; a broken value goes back to the default.
export const resolveDock = (saved: IslandDock | null, screens: IslandScreen[]): ResolvedDock | null => {
  const main = screens.find((screen) => screen.primary) ?? screens[0];
  if (!main) return null;

  const valid  = saved && DOCK_EDGES.includes(saved.edge) && Number.isFinite(saved.offset);
  const dock   = valid ? saved : DEFAULT_DOCK;
  const screen = screens.find((candidate) => candidate.id === dock.screen) ?? main;

  return { dock: { edge: dock.edge, offset: Math.min(Math.max(dock.offset, 0), 1), screen: screen.id }, screen };
};
