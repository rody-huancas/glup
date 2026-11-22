import { useCallback, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { moveItem } from '@/modules/pdf/utils/reorder';

interface DragState {
  index  : number;
  startY : number;
}

// Order with buttons and by dragging the handle (pointer events, no libraries).
// While dragging, the row follows the pointer and swaps with its neighbor every row height.
export const useReorder = <T,>(initial: T[], rowHeight: number) => {
  const [items, setItems]       = useState(initial);
  const [dragging, setDragging] = useState<number | null>(null);
  const [offset, setOffset]     = useState(0);
  const drag                    = useRef<DragState | null>(null);

  const move = useCallback((from: number, to: number) => {
    setItems((current) => moveItem({ items: current, from, to }));
  }, []);

  const onHandleDown = useCallback((index: number, event: PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { index, startY: event.clientY };
    setDragging(index);
    setOffset(0);
  }, []);

  const onHandleMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state) return;

    const delta = event.clientY - state.startY;
    const steps = Math.trunc(delta / rowHeight);

    if (steps !== 0) {
      setItems((current) => {
        const target = Math.max(0, Math.min(current.length - 1, state.index + steps));
        if (target === state.index) return current;

        drag.current = { index: target, startY: state.startY + (target - state.index) * rowHeight };
        setDragging(target);
        return moveItem({ items: current, from: state.index, to: target });
      });
    }

    setOffset(event.clientY - (drag.current?.startY ?? event.clientY));
  }, [rowHeight]);

  const onHandleUp = useCallback(() => {
    drag.current = null;
    setDragging(null);
    setOffset(0);
  }, []);

  return { items, dragging, offset, move, onHandleDown, onHandleMove, onHandleUp };
};
