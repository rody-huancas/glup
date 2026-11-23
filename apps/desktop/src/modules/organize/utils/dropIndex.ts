import type { Point } from '@/shared/interfaces/point';

interface TileBox {
  left   : number;
  top    : number;
  width  : number;
  height : number;
}

interface DropIndexParams {
  // Every tile's box in the current order (screen coordinates).
  boxes : TileBox[];
  point : Point;
}

// Where dragged pages would land: before the tile under the pointer (left half) or after it (right
// half). Rows are found first, so the gaps between tiles and the end of a row work too.
export const dropIndex = ({ boxes, point }: DropIndexParams): number => {
  if (boxes.length === 0) return 0;

  const rowTops = [...new Set(boxes.map((box) => box.top))].sort((a, b) => a - b);
  const rowTop  = rowTops.reduce((best, top) => (point.y >= top ? top : best), rowTops[0]);
  const row     = boxes.map((box, index) => ({ box, index })).filter(({ box }) => box.top === rowTop);

  for (const { box, index } of row) {
    if (point.x < box.left + box.width / 2) return index;
  }

  return row[row.length - 1].index + 1;
};

// A move that leaves the pages where they are (dropping a page right before or after itself).
export const isSamePlace = (order: number[], moved: number[], to: number): boolean => {
  const indexes = moved.map((page) => order.indexOf(page)).sort((a, b) => a - b);
  const block   = indexes.every((value, position) => value === indexes[0] + position);
  return block && to >= indexes[0] && to <= indexes[indexes.length - 1] + 1;
};
