import { useRef } from 'react';
import type { PointerEvent } from 'react';
import { MIN_SIZE } from '@/modules/sign/constants/sign';
import type { RelativeRect, Size } from '@/modules/sign/interfaces/geometry';
import type { Corner } from '@/modules/sign/types/corner';
import type { DragMode } from '@/modules/sign/types/dragMode';
import { moveByPixels, relativeToScreen, resizeFromCorner, screenToRelative } from '@/modules/sign/utils/coordinates';

interface UsePlacementDragParams {
  rect     : RelativeRect;
  // The rendered page, in CSS pixels.
  view     : Size;
  onSelect : () => void;
  onMove   : (rect: RelativeRect) => void;
  onResize : (rect: RelativeRect) => void;
}

interface DragStart {
  pointerId : number;
  x         : number;
  y         : number;
  rect      : RelativeRect;
  mode      : DragMode;
}

// Pointer events with capture: the element follows the pointer even outside it, in page coordinates
// so the zoom does not matter.
export const usePlacementDrag = ({ rect, view, onSelect, onMove, onResize }: UsePlacementDragParams) => {
  const start = useRef<DragStart | null>(null);

  const begin = (mode: DragMode) => (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const item = event.currentTarget.closest('[data-placement]');
    if (item instanceof HTMLElement) item.focus({ preventScroll: true });

    onSelect();
    start.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, rect, mode };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = start.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;

    if (drag.mode.kind === 'move') {
      onMove(moveByPixels({ rect: drag.rect, dx, dy, view }));
      return;
    }

    const resized = resizeFromCorner({ rect: relativeToScreen(drag.rect, view), corner: drag.mode.corner, dx, dy, bounds: view, minSize: MIN_SIZE });
    onResize(screenToRelative(resized, view));
  };

  const end = (event: PointerEvent<HTMLElement>) => {
    if (start.current?.pointerId !== event.pointerId) return;

    start.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handlers = (mode: DragMode) => ({ onPointerDown: begin(mode), onPointerMove, onPointerUp: end, onPointerCancel: end });

  return {
    move   : handlers({ kind: 'move' }),
    corner : (corner: Corner) => handlers({ kind: 'resize', corner }),
  };
};
