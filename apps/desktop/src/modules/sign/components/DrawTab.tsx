import type { useDrawing } from '@/modules/sign/hooks/useDrawing';
import { CREATE_TEXTS, DRAW_CANVAS } from '@/modules/sign/constants/sign';
import { Button } from '@/shared/components/Button';

interface DrawTabProps {
  drawing: ReturnType<typeof useDrawing>;
}

// Light paper with a guide line; the canvas keeps 480x180 units whatever its size on screen.
export const DrawTab = ({ drawing }: DrawTabProps) => (
  <div className="flex flex-col gap-2">
    <div className="relative overflow-hidden rounded-control bg-[#FAFAF7]" style={{ width: DRAW_CANVAS.width, height: DRAW_CANVAS.height }}>
      <span className="pointer-events-none absolute inset-x-6 border-t border-dashed border-[#B9B6C6]" style={{ top: DRAW_CANVAS.guide }} />
      {drawing.empty && <span className="pointer-events-none absolute left-6 text-[11px] text-[#8C8899]" style={{ top: DRAW_CANVAS.guide + 6 }}>{CREATE_TEXTS.drawHint}</span>}
      <canvas ref={drawing.canvasRef} className="absolute inset-0 h-full w-full cursor-crosshair touch-none" {...drawing.handlers} />
    </div>
    <div className="flex gap-2">
      <Button variant="secondary" onClick={drawing.undo} disabled={drawing.empty} className="h-8 disabled:opacity-45">
        {CREATE_TEXTS.undo}
      </Button>
      <Button variant="secondary" onClick={drawing.clear} disabled={drawing.empty} className="h-8 disabled:opacity-45">
        {CREATE_TEXTS.clear}
      </Button>
    </div>
  </div>
);
