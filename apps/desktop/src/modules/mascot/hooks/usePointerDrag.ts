import { useCallback, useRef } from 'react';
import type { PointerEvent } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { DRAG_THRESHOLD } from '@/modules/mascot/constants/animation';
import type { Point } from '@/shared/interfaces/point';
import { distance } from '@/shared/utils/math';

export const usePointerDrag = (onClick: () => void) => {
  const origin = useRef<Point | null>(null);

  const onPointerDown = useCallback((event: PointerEvent) => {
    if (event.button !== 0) return;
    origin.current = { x: event.screenX, y: event.screenY };
  }, []);

  const onPointerMove = useCallback((event: PointerEvent) => {
    if (!origin.current) return;
    if (distance(origin.current, { x: event.screenX, y: event.screenY }) < DRAG_THRESHOLD) return;

    origin.current = null;
    void getCurrentWindow().startDragging();
  }, []);

  const onPointerUp = useCallback(() => {
    if (origin.current) onClick();
    origin.current = null;
  }, [onClick]);

  const onPointerCancel = useCallback(() => {
    origin.current = null;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
};
