import { useCallback, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { BubbleSpot } from '@/modules/dock/interfaces/bubbleSpot';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import { spotAt } from '@/modules/dock/utils/bubble';
import { drawingPoint } from '@/modules/dock/utils/dockPreview';
import { dockAt } from '@/modules/dock/utils/snapDock';
import { logPosition } from '@/modules/island/utils/islandLog';
import type { Size } from '@/shared/interfaces/size';

interface DockDragParams {
  bubble     : boolean;
  work       : Size;
  screen     : string;
  onDock     : (dock: IslandDock) => void;
  onSpot     : (spot: BubbleSpot) => void;
}

// The marker of the drawing follows the pointer to any point of any edge (or a corner, or for the bubble
// anywhere), as dragging the pill would; letting go puts Glup there. A plain click is a drag of no length.
export const useDockDrag = ({ bubble, work, screen, onDock, onSpot }: DockDragParams) => {
  const [preview, setPreview] = useState<{ dock: IslandDock | null; spot: BubbleSpot | null } | null>(null);
  const box                   = useRef<DOMRect | null>(null);

  const at = useCallback((x: number, y: number) => {
    const rect  = box.current;
    if (!rect) return null;
    const share = { x: Math.min(1, Math.max(0, (x - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (y - rect.top) / rect.height)) };
    const point = drawingPoint(share, work);
    return bubble ? { dock: null, spot: spotAt(point, work, screen) } : { dock: dockAt(point, work, screen), spot: null };
  }, [bubble, work, screen]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    box.current = event.currentTarget.getBoundingClientRect();
    logPosition('marcador presionado');
    setPreview(at(event.clientX, event.clientY));
  }, [at]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!box.current) return;
    setPreview(at(event.clientX, event.clientY));
  }, [at]);

  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!box.current) return;
    const landing = at(event.clientX, event.clientY);
    box.current   = null;
    setPreview(null);
    logPosition(`marcador suelto: ${landing?.dock ? `${landing.dock.edge} ${Math.round(landing.dock.offset * 100)} %` : 'burbuja'}`);
    if (landing?.dock) onDock(landing.dock);
    if (landing?.spot) onSpot(landing.spot);
  }, [at, onDock, onSpot]);

  const onPointerCancel = useCallback(() => {
    box.current = null;
    setPreview(null);
  }, []);

  return { preview, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } };
};
