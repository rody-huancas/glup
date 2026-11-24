import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';
import { DRAG_THRESHOLD } from '@/modules/island/constants/island';
import type { Point } from '@/shared/interfaces/point';
import { distance } from '@/shared/utils/math';

interface UseIslandDragGestureParams {
  // Only the resting pill can be dragged.
  enabled     : boolean;
  onDragStart : () => void;
}

const MAIN_BUTTON = 0;

// Press on the pill and move: from a few pixels on (or as soon as the cursor leaves the pill with the
// button down) it is a drag, and Rust follows the cursor from there. A press without moving is still a
// click (it opens the island); the click that ends a drag is swallowed.
export const useIslandDragGesture = ({ enabled, onDragStart }: UseIslandDragGestureParams) => {
  const start   = useRef<Point | null>(null);
  const dragged = useRef(false);
  const stop    = useRef<(() => void) | null>(null);

  const release = useCallback(() => {
    stop.current?.();
    stop.current  = null;
    start.current = null;
  }, []);

  const begin = useCallback(() => {
    release();
    dragged.current = true;
    onDragStart();
  }, [release, onDragStart]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!enabled || event.button !== MAIN_BUTTON) return;

    release();
    start.current = { x: event.screenX, y: event.screenY };

    const onMove = (move: globalThis.PointerEvent) => {
      if (start.current && distance(start.current, { x: move.screenX, y: move.screenY }) >= DRAG_THRESHOLD) begin();
    };
    // Out of the pill's region the window stops hearing the pointer: a press that leaves it is a drag.
    const onLeave = (leave: globalThis.PointerEvent) => {
      if (leave.buttons & 1) begin();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', release);
    document.documentElement.addEventListener('pointerleave', onLeave);

    stop.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', release);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled, release, begin]);

  useEffect(() => release, [release]);

  // True once after a drag: the click it ends with must not open the island.
  const consumeClick = useCallback((): boolean => {
    const was       = dragged.current;
    dragged.current = false;
    return was;
  }, []);

  return { onPointerDown, consumeClick };
};
