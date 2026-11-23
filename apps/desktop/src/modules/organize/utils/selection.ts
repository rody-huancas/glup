import type { SelectMode } from '@/modules/organize/types/selectMode';

interface SelectPageParams {
  // Original page numbers, in the current order.
  order    : number[];
  selected : number[];
  // Where the last plain or Ctrl click was, for Shift ranges.
  anchor   : number | null;
  page     : number;
  mode     : SelectMode;
}

interface Selection {
  selected : number[];
  anchor   : number | null;
}

// Click: only that one. Ctrl+click: add it or take it out. Shift+click: everything from the anchor to it.
export const selectPage = ({ order, selected, anchor, page, mode }: SelectPageParams): Selection => {
  if (mode === 'single') return { selected: [page], anchor: page };

  if (mode === 'toggle') {
    const next = selected.includes(page) ? selected.filter((item) => item !== page) : [...selected, page];
    return { selected: order.filter((item) => next.includes(item)), anchor: page };
  }

  const from = anchor === null ? -1 : order.indexOf(anchor);
  const to   = order.indexOf(page);
  if (from === -1 || to === -1) return { selected: [page], anchor: page };

  const [start, end] = from <= to ? [from, to] : [to, from];
  return { selected: order.slice(start, end + 1), anchor };
};

export const selectModeOf = (event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }): SelectMode => {
  if (event.shiftKey) return 'range';
  return event.ctrlKey || event.metaKey ? 'toggle' : 'single';
};

// The pages an action applies to: the selection when the page is in it, otherwise just that page.
export const targetPages = (selected: number[], page: number): number[] => (selected.includes(page) ? selected : [page]);
