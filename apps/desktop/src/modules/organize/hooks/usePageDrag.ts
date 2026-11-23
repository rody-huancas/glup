import { useCallback, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { DRAG_THRESHOLD, SCROLL_EDGE, SCROLL_STEP } from '@/modules/organize/constants/grid';
import { dropIndex, isSamePlace } from '@/modules/organize/utils/dropIndex';
import { targetPages } from '@/modules/organize/utils/selection';

interface UsePageDragParams {
  // Original page numbers, in the current order.
  order    : number[];
  selected : number[];
  // A page dragged without being chosen becomes the chosen one.
  onPick   : (page: number) => void;
  onDrop   : (pages: number[], to: number) => void;
}

interface Press {
  page   : number;
  startX : number;
  startY : number;
  // Pages being dragged, once the pointer travelled far enough.
  pages  : number[] | null;
}

// Reorder by dragging (pointer events, no libraries): the dragged pages stay dimmed in place and a bar
// shows where they will land. A press that never travels is a plain click.
export const usePageDrag = ({ order, selected, onPick, onDrop }: UsePageDragParams) => {
  const [dragging, setDragging] = useState<number[] | null>(null);
  const [dropAt, setDropAt]     = useState<number | null>(null);
  const gridRef                 = useRef<HTMLUListElement | null>(null);
  const tiles                   = useRef(new Map<number, HTMLElement>());
  const press                   = useRef<Press | null>(null);
  const justDragged             = useRef(false);

  const registerTile = useCallback((page: number) => (element: HTMLElement | null) => {
    if (element) tiles.current.set(page, element);
    else tiles.current.delete(page);
  }, []);

  const indexAt = useCallback((x: number, y: number): number => {
    const boxes = order.map((page) => {
      const rect = tiles.current.get(page)?.getBoundingClientRect();
      return rect ? { left: rect.left, top: Math.round(rect.top), width: rect.width, height: rect.height } : { left: 0, top: 0, width: 0, height: 0 };
    });
    return dropIndex({ boxes, point: { x, y } });
  }, [order]);

  const scrollNearEdges = (y: number) => {
    const grid = gridRef.current;
    if (!grid) return;

    const rect = grid.getBoundingClientRect();
    if (y < rect.top + SCROLL_EDGE) grid.scrollBy({ top: -SCROLL_STEP });
    else if (y > rect.bottom - SCROLL_EDGE) grid.scrollBy({ top: SCROLL_STEP });
  };

  const onPointerDown = useCallback((page: number, event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    press.current = { page, startX: event.clientX, startY: event.clientY, pages: null };
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const current = press.current;
    if (!current) return;

    if (!current.pages) {
      if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < DRAG_THRESHOLD) return;

      if (!selected.includes(current.page)) onPick(current.page);
      current.pages = targetPages(selected, current.page);
      setDragging(current.pages);
    }

    scrollNearEdges(event.clientY);
    setDropAt(indexAt(event.clientX, event.clientY));
  }, [selected, onPick, indexAt]);

  const finish = useCallback((drop: boolean, event?: PointerEvent<HTMLElement>) => {
    const current = press.current;
    press.current = null;

    if (current?.pages && event) {
      const to = indexAt(event.clientX, event.clientY);
      if (drop && !isSamePlace(order, current.pages, to)) onDrop(current.pages, to);
      // The click that follows a drag is not a selection.
      justDragged.current = true;
    }

    setDragging(null);
    setDropAt(null);
  }, [indexAt, order, onDrop]);

  const onPointerUp     = useCallback((event: PointerEvent<HTMLElement>) => finish(true, event), [finish]);
  const onPointerCancel = useCallback((event: PointerEvent<HTMLElement>) => finish(false, event), [finish]);

  // True once after a drag, so its click is ignored.
  const takeClick = useCallback((): boolean => {
    const dragged = justDragged.current;
    justDragged.current = false;
    return !dragged;
  }, []);

  return { gridRef, registerTile, tiles, dragging, dropAt, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, takeClick };
};
