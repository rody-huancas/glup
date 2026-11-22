import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { DRAW_CANVAS } from '@/modules/sign/constants/sign';
import { fillStrokes } from '@/modules/sign/utils/signatureImage';
import type { StrokePoints } from '@/modules/sign/utils/strokes';

// "Dibujar": strokes in canvas units (480x180), drawn with perfect-freehand; undo removes the last one.
export const useDrawing = (color: string) => {
  const canvasRef             = useRef<HTMLCanvasElement | null>(null);
  const current               = useRef<StrokePoints | null>(null);
  const [strokes, setStrokes] = useState<StrokePoints[]>([]);

  const paint = useCallback(() => {
    const canvas  = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const ratio   = window.devicePixelRatio;
    canvas.width  = DRAW_CANVAS.width * ratio;
    canvas.height = DRAW_CANVAS.height * ratio;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = color;
    fillStrokes(context, current.current ? [...strokes, current.current] : strokes);
  }, [strokes, color]);

  useEffect(paint, [paint]);

  const pointOf = (event: PointerEvent<HTMLCanvasElement>): number[] => {
    const bounds = event.currentTarget.getBoundingClientRect();

    return [
      ((event.clientX - bounds.left) * DRAW_CANVAS.width) / bounds.width,
      ((event.clientY - bounds.top) * DRAW_CANVAS.height) / bounds.height,
      event.pressure || 0.5,
    ];
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    current.current = [pointOf(event)];
    paint();
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!current.current) return;

    current.current.push(pointOf(event));
    paint();
  };

  const onPointerUp = () => {
    const stroke = current.current;
    if (!stroke) return;

    current.current = null;
    setStrokes((previous) => [...previous, stroke]);
  };

  return {
    canvasRef,
    strokes,
    empty    : strokes.length === 0,
    handlers : { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    undo     : () => setStrokes((previous) => previous.slice(0, -1)),
    clear    : () => setStrokes([]),
  };
};
