import type { CSSProperties } from 'react';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { IslandShape } from '@/modules/island/interfaces/islandShape';
import { buildIslandOutline, buildIslandPath, getShapeSize } from '@/modules/island/utils/islandPath';

interface RenderShapeParams {
  elements : IslandElements;
  shape    : IslandShape;
}

export const getShapeStyle = (shape: IslandShape): CSSProperties => {
  const { width, height } = getShapeSize(shape);

  return {
    width    : `${width}px`,
    height   : `${height}px`,
    clipPath : `path('${buildIslandPath(shape)}')`,
  };
};

// Called on every animation frame: resizes the panel and redraws the silhouette, its clip and its border.
export const renderIslandShape = ({ elements, shape }: RenderShapeParams) => {
  const panel = elements.panel.current;
  const path  = buildIslandPath(shape);

  if (panel) Object.assign(panel.style, getShapeStyle(shape));

  elements.fill.current?.setAttribute('d', path);
  elements.outline.current?.setAttribute('d', buildIslandOutline(shape));
};
