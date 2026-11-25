import { useCallback, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

// Below this the press was a click (it chooses the sheet), above it the sheet is being dragged.
const DRAG_THRESHOLD = 6;

// The strip of sheets reorders by dragging a thumbnail sideways (the webview's own drag belongs to file
// drops): the thumbnail under the pointer marks where it lands.
export const useSheetDrag = (onMove: (from: number, to: number) => void) => {
  const list                = useRef<HTMLOListElement | null>(null);
  const [from, setFrom]     = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const start               = useRef<{ x: number; index: number } | null>(null);
  const moved               = useRef(false);

  const indexAt = (x: number): number => {
    const items = Array.from(list.current?.children ?? []);
    const after = items.findIndex((item) => {
      const box = item.getBoundingClientRect();
      return x < box.left + box.width / 2;
    });
    return after === -1 ? items.length : after;
  };

  const onPointerDown = useCallback((index: number) => (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    start.current = { x: event.clientX, index };
    moved.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!start.current) return;
    if (!moved.current && Math.abs(event.clientX - start.current.x) < DRAG_THRESHOLD) return;
    moved.current = true;
    setFrom(start.current.index);
    setTarget(indexAt(event.clientX));
  }, []);

  const onPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    const began = start.current;
    start.current = null;
    setFrom(null);
    setTarget(null);
    if (!began || !moved.current) return;
    const landing = indexAt(event.clientX);
    const to      = landing > began.index ? landing - 1 : landing;
    if (to !== began.index) onMove(began.index, to);
  }, [onMove]);

  // A click right after a drag is not a choice.
  const takeClick = useCallback(() => {
    const was     = moved.current;
    moved.current = false;
    return !was;
  }, []);

  return { list, from, target, onPointerDown, onPointerMove, onPointerUp, takeClick };
};
