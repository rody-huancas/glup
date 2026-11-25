export interface Box {
  x      : number;
  y      : number;
  width  : number;
  height : number;
}

export interface Placed<T> extends Box {
  item : T;
}

interface TreemapParams<T> {
  items  : T[];
  sizeOf : (item: T) => number;
  box    : Box;
}

// The worst shape of a row: how far its longest rectangle is from a square.
const worst = (row: number[], side: number, scale: number): number => {
  const total = row.reduce((sum, value) => sum + value, 0) * scale;
  if (total === 0 || side === 0) return Infinity;
  const thickness = total / side;
  return Math.max(...row.map((value) => {
    const length = (value * scale) / thickness;
    return Math.max(length / thickness, thickness / length);
  }));
};

// A squarified treemap: every item gets a rectangle whose area is its share of the box, as close to a
// square as it can be, laid out row by row along the shorter side. Items of size 0 are left out.
export const treemap = <T,>({ items, sizeOf, box }: TreemapParams<T>): Placed<T>[] => {
  const sized = items.map((item) => ({ item, size: sizeOf(item) })).filter((entry) => entry.size > 0).sort((a, b) => b.size - a.size);
  const total = sized.reduce((sum, entry) => sum + entry.size, 0);
  if (total === 0 || box.width <= 0 || box.height <= 0) return [];

  const scale  = (box.width * box.height) / total;
  const placed: Placed<T>[] = [];
  let free     = { ...box };
  let start    = 0;

  while (start < sized.length) {
    const side = Math.min(free.width, free.height);
    let end    = start + 1;
    while (end < sized.length && worst(sized.slice(start, end + 1).map((entry) => entry.size), side, scale) <= worst(sized.slice(start, end).map((entry) => entry.size), side, scale)) end += 1;

    const row       = sized.slice(start, end);
    const rowArea   = row.reduce((sum, entry) => sum + entry.size, 0) * scale;
    const across    = free.width >= free.height;
    const thickness = rowArea / (across ? free.height : free.width);
    let offset      = 0;
    for (const entry of row) {
      const length = (entry.size * scale) / thickness;
      placed.push(across
        ? { item: entry.item, x: free.x, y: free.y + offset, width: thickness, height: length }
        : { item: entry.item, x: free.x + offset, y: free.y, width: length, height: thickness });
      offset += length;
    }
    free = across
      ? { x: free.x + thickness, y: free.y, width: free.width - thickness, height: free.height }
      : { x: free.x, y: free.y + thickness, width: free.width, height: free.height - thickness };
    start = end;
  }
  return placed;
};

// "34 %", "0,4 %", "< 0,1 %".
export const percentOf = (part: number, whole: number): string => {
  if (whole <= 0 || part <= 0) return '0 %';
  const value = (part / whole) * 100;
  if (value < 0.1) return '< 0,1 %';
  return `${value >= 10 ? Math.round(value) : value.toFixed(1).replace('.', ',')} %`;
};
