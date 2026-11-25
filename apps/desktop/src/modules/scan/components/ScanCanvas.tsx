import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ScanHandle } from '@/modules/scan/components/ScanHandle';
import { ScanLoupe } from '@/modules/scan/components/ScanLoupe';
import { SCAN_TEXTS } from '@/modules/scan/constants/texts';
import { useCornerDrag } from '@/modules/scan/hooks/useCornerDrag';
import type { ScanSheet } from '@/modules/scan/interfaces/scanSheet';
import type { Quad } from '@/modules/scan/types/quad';
import { isConvexQuad, nudgeCorner, outsidePath } from '@/modules/scan/utils/corners';
import { fitRect } from '@/modules/scan/utils/layout';
import { Skeleton } from '@/shared/components/Skeleton';
import { useElementSize } from '@/shared/hooks/useElementSize';

interface ScanCanvasProps {
  sheet    : ScanSheet;
  onChange : (corners: Quad) => void;
}

// The photo with the sheet drawn over it (what is outside darkened) and its four corners to move; the
// magnifier while one is dragged or moved with the keyboard.
export const ScanCanvas = ({ sheet, onChange }: ScanCanvasProps) => {
  const { ref, size }     = useElementSize<HTMLDivElement>();
  const photo             = fitRect(size, { width: sheet.width, height: sheet.height });
  const drag              = useCornerDrag({ corners: sheet.corners, photo, onChange });
  const [keyed, setKeyed] = useState<number | null>(null);
  const hintId            = useId();
  const loupe             = drag.dragging ?? keyed;
  const convex            = isConvexQuad(sheet.corners, sheet.width, sheet.height);

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = nudgeCorner({ corners: sheet.corners, index, key: event.key, big: event.shiftKey });
    if (!next) return;
    event.preventDefault();
    setKeyed(index);
    onChange(next);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      {sheet.status === 'ready' && (!sheet.found || !convex) && (
        <p role="status" className="shrink-0 rounded-control border border-warn/40 bg-raised px-3 py-1.5 text-[12px] text-text">
          {convex ? SCAN_TEXTS.notFound : SCAN_TEXTS.crossed}
        </p>
      )}
      <div ref={ref} className="relative min-h-0 flex-1 select-none">
        <span id={hintId} className="sr-only">{SCAN_TEXTS.cornerHint}</span>
        {sheet.status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Skeleton className="h-full w-full rounded-control" />
            <span className="absolute text-[12px] font-semibold text-muted">{SCAN_TEXTS.finding}</span>
          </div>
        )}
        {sheet.status === 'failed' && (
          <p className="absolute inset-0 flex items-center justify-center text-[13px] text-muted">{sheet.error ?? SCAN_TEXTS.failed}</p>
        )}
        {sheet.status === 'ready' && sheet.url && photo.width > 0 && (
          <>
            <img src={sheet.url} alt="" draggable={false} className="pointer-events-none absolute rounded-sm" style={{ left: photo.x, top: photo.y, width: photo.width, height: photo.height }} />
            <svg aria-hidden className="pointer-events-none absolute" style={{ left: photo.x, top: photo.y }} width={photo.width} height={photo.height}>
              <path d={outsidePath(sheet.corners, photo.width, photo.height)} fill="var(--color-scrim)" fillRule="evenodd" />
              <polygon
                points={sheet.corners.map((corner) => `${corner.x * photo.width},${corner.y * photo.height}`).join(' ')}
                fill="none"
                stroke={convex ? 'var(--color-mint)' : 'var(--color-danger)'}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            </svg>
            {sheet.corners.map((corner, index) => (
              <ScanHandle
                key={index}
                index={index}
                corner={corner}
                left={photo.x + corner.x * photo.width}
                top={photo.y + corner.y * photo.height}
                active={loupe === index}
                hintId={hintId}
                onKeyDown={onKeyDown(index)}
                onPointerDown={drag.onPointerDown(index)}
                onPointerMove={drag.onPointerMove(index)}
                onPointerUp={drag.onPointerUp}
                onBlur={() => setKeyed(null)}
              />
            ))}
            {loupe !== null && <ScanLoupe url={sheet.url} photo={photo} box={size} corner={sheet.corners[loupe]} />}
          </>
        )}
      </div>
    </div>
  );
};
