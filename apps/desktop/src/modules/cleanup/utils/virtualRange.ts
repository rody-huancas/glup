interface VisibleRangeParams {
  scrollTop : number;
  viewport  : number;
  rowHeight : number;
  count     : number;
  overscan  : number;
}

export interface VisibleRange {
  start : number;
  end   : number;
}

// Rows [start, end) that cover the viewport, with `overscan` extra rows on each side.
export const visibleRange = ({ scrollTop, viewport, rowHeight, count, overscan }: VisibleRangeParams): VisibleRange => {
  const first = Math.floor(scrollTop / rowHeight);
  const last  = Math.ceil((scrollTop + viewport) / rowHeight);

  return { start: Math.max(0, first - overscan), end: Math.min(count, last + overscan) };
};
