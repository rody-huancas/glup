import { useCallback, useState } from 'react';
import type { PointerEvent } from 'react';
import type { Quad } from '@/modules/scan/types/quad';
import { moveCorner } from '@/modules/scan/utils/corners';
import type { Rect } from '@/shared/interfaces/rect';

interface CornerDragParams {
  corners  : Quad;
  // Where the photo is drawn inside the box, in pixels.
  photo    : Rect;
  onChange : (corners: Quad) => void;
}

// A corner follows the pointer from where it was grabbed (pointer capture keeps it even off the photo).
export const useCornerDrag = ({ corners, photo, onChange }: CornerDragParams) => {
  const [dragging, setDragging] = useState<number | null>(null);

  const at = useCallback((event: PointerEvent<HTMLElement>, box: DOMRect) => ({
    x : (event.clientX - box.left - photo.x) / Math.max(1, photo.width),
    y : (event.clientY - box.top - photo.y) / Math.max(1, photo.height),
  }), [photo]);

  const onPointerDown = useCallback((index: number) => (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    setDragging(index);
  }, []);

  const onPointerMove = useCallback((index: number) => (event: PointerEvent<HTMLButtonElement>) => {
    if (dragging !== index) return;
    const box = event.currentTarget.parentElement?.getBoundingClientRect();
    if (box) onChange(moveCorner({ corners, index, point: at(event, box) }));
  }, [dragging, corners, at, onChange]);

  const onPointerUp = useCallback(() => setDragging(null), []);

  return { dragging, onPointerDown, onPointerMove, onPointerUp };
};
