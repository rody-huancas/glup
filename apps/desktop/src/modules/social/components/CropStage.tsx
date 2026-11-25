import { useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { PhotoFrame } from '@/modules/photo-tools/interfaces/photoFrame';
import { MOVE_STEP, SOCIAL_TEXTS, ZOOM_STEP } from '@/modules/social/constants/texts';
import { MAX_ZOOM } from '@/modules/social/utils/frame';

interface CropStageProps {
  url    : string;
  frame  : PhotoFrame;
  zoom   : number;
  onMove : (dx: number, dy: number) => void;
  onZoom : (zoom: number) => void;
}

// The photo with the frame of the size over it (the rest dimmed): dragged with the mouse, the wheel or
// + and − to get closer, the arrows to move it (Shift for bigger steps).
export const CropStage = ({ url, frame, zoom, onMove, onZoom }: CropStageProps) => {
  const box  = useRef<HTMLDivElement | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);

  const down = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    last.current = { x: event.clientX, y: event.clientY };
  };
  const drag = (event: PointerEvent<HTMLDivElement>) => {
    const rect = box.current?.getBoundingClientRect();
    if (!last.current || !rect || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    onMove((event.clientX - last.current.x) / rect.width, (event.clientY - last.current.y) / rect.height);
    last.current = { x: event.clientX, y: event.clientY };
  };
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    const step  = event.shiftKey ? MOVE_STEP.big : MOVE_STEP.small;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[event.key]) {
      event.preventDefault();
      return onMove(...moves[event.key]);
    }
    if (event.key === '+' || event.key === '=') onZoom(Math.min(MAX_ZOOM, zoom + ZOOM_STEP));
    if (event.key === '-') onZoom(Math.max(1, zoom - ZOOM_STEP));
  };

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center rounded-control bg-bg p-2">
      <div ref={box} className="relative flex max-h-full max-w-full overflow-hidden select-none">
        <img src={url} alt="" draggable={false} className="max-h-[60vh] max-w-full object-contain @3xl:max-h-[calc(100vh-260px)]" />
        <div
          role="group"
          tabIndex={0}
          aria-label={SOCIAL_TEXTS.frame}
          onPointerDown={down}
          onPointerMove={drag}
          onPointerUp={() => (last.current = null)}
          onWheel={(event) => onZoom(Math.min(MAX_ZOOM, Math.max(1, zoom - Math.sign(event.deltaY) * ZOOM_STEP)))}
          onKeyDown={keys}
          className="absolute cursor-move touch-none rounded-sm border-2 border-fam-images shadow-[0_0_0_9999px_rgb(0_0_0/0.55)] outline-none focus-visible:ring-2 focus-visible:ring-fam-images focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          style={{ left: `${frame.x * 100}%`, top: `${frame.y * 100}%`, width: `${frame.width * 100}%`, height: `${frame.height * 100}%` }}
        />
      </div>
    </div>
  );
};
