import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import { buildDockOutline, buildDockPath } from '@/modules/dock/utils/dockGeometry';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { IslandShape } from '@/modules/island/interfaces/islandShape';

interface RenderShapeParams {
  elements  : IslandElements;
  shape     : IslandShape;
  placement : IslandPlacement;
}

// Called on every animation frame: redraws the silhouette, its clip and its border for the shape at
// the island's edge. The panel covers the whole window; only the clip shows the island.
export const renderIslandShape = ({ elements, shape, placement }: RenderShapeParams) => {
  const panel = elements.panel.current;
  const path  = buildDockPath(placement, shape);

  if (panel) panel.style.clipPath = `path('${path}')`;

  elements.fill.current?.setAttribute('d', path);
  elements.outline.current?.setAttribute('d', buildDockOutline(placement, shape));
};
