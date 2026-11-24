import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';
import { DRAG_THRESHOLD } from '@/modules/island/constants/island';
import type { PressEvent } from '@/modules/island/types/pressEvent';
import { logBubble } from '@/modules/island/utils/islandLog';
import { INITIAL_PRESS, pressStep } from '@/modules/island/utils/pressGesture';
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
// click (it opens the island); the click that ends a drag is swallowed, and only that one (pressStep).
export const useIslandDragGesture = ({ enabled, onDragStart }: UseIslandDragGestureParams) => {
  const start = useRef<Point | null>(null);
  const press = useRef(INITIAL_PRESS);
  const stop  = useRef<(() => void) | null>(null);

  const step = useCallback((event: PressEvent): boolean => {
    const next    = pressStep(press.current, event);
    press.current = next.state;
    return next.click;
  }, []);

  const release = useCallback(() => {
    stop.current?.();
    stop.current  = null;
    start.current = null;
  }, []);

  const begin = useCallback(() => {
    release();
    step({ type: 'drag' });
    logBubble('arrastre');
    onDragStart();
  }, [release, step, onDragStart]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.button !== MAIN_BUTTON) return;

    // A new press starts clean, even where it cannot be dragged.
    step({ type: 'down' });
    if (!enabled) return;

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
  }, [enabled, release, begin, step]);

  useEffect(() => release, [release]);

  // True for the click that ends a drag: it must not open the island.
  const consumeClick = useCallback((): boolean => {
    const swallowed = !step({ type: 'click' });
    if (swallowed) logBubble('clic tragado: terminaba un arrastre');
    return swallowed;
  }, [step]);

  return { onPointerDown, consumeClick };
};
