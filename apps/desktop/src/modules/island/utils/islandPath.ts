import type { IslandShape, ShapeSize } from '@/modules/island/interfaces/islandShape';

interface ShapeMetrics {
  total  : number;
  height : number;
  ear    : number;
  bottom : number;
  left   : number;
  right  : number;
}

const round = (value: number): number => Math.round(value * 100) / 100;

// Clamps the radii so they never overlap, even while the shape squashes below its resting size.
const getMetrics = ({ width, height, earRadius, bottomRadius }: IslandShape): ShapeMetrics => {
  const body   = Math.max(width, 0);
  const tall   = Math.max(height, 0);
  const ear    = Math.max(Math.min(earRadius, tall), 0);
  const bottom = Math.max(Math.min(bottomRadius, tall - ear, body / 2), 0);

  return {
    total  : round(body + ear * 2),
    height : round(tall),
    ear    : round(ear),
    bottom : round(bottom),
    left   : round(ear),
    right  : round(body + ear),
  };
};

// Full width of the silhouette, ears included.
export const getShapeSize = (shape: IslandShape): ShapeSize => {
  const { total, height } = getMetrics(shape);
  return { width: total, height };
};

// Closed silhouette: top edge glued to the screen, concave ears, rounded bottom corners.
export const buildIslandPath = (shape: IslandShape): string => {
  const { total, height, ear, bottom, left, right } = getMetrics(shape);

  return [
    'M 0 0',
    `L ${total} 0`,
    `A ${ear} ${ear} 0 0 0 ${right} ${ear}`,
    `L ${right} ${height - bottom}`,
    `A ${bottom} ${bottom} 0 0 1 ${right - bottom} ${height}`,
    `L ${left + bottom} ${height}`,
    `A ${bottom} ${bottom} 0 0 1 ${left} ${height - bottom}`,
    `L ${left} ${ear}`,
    `A ${ear} ${ear} 0 0 0 0 0`,
    'Z',
  ].join(' ');
};

// Same silhouette left open along the top edge, so the border never touches the screen edge.
export const buildIslandOutline = (shape: IslandShape): string => {
  const { total, height, ear, bottom, left, right } = getMetrics(shape);

  return [
    'M 0 0',
    `A ${ear} ${ear} 0 0 1 ${left} ${ear}`,
    `L ${left} ${height - bottom}`,
    `A ${bottom} ${bottom} 0 0 0 ${left + bottom} ${height}`,
    `L ${right - bottom} ${height}`,
    `A ${bottom} ${bottom} 0 0 0 ${right} ${height - bottom}`,
    `L ${right} ${ear}`,
    `A ${ear} ${ear} 0 0 1 ${total} 0`,
  ].join(' ');
};
