import { LOUPE } from '@/modules/scan/constants/scan';
import { loupeAt } from '@/modules/scan/utils/layout';
import type { Point } from '@/shared/interfaces/point';
import type { Rect } from '@/shared/interfaces/rect';
import type { Size } from '@/shared/interfaces/size';

interface ScanLoupeProps {
  url    : string;
  photo  : Rect;
  box    : Size;
  corner : Point;
}

// The photo enlarged around the corner being moved, with a cross on the exact point.
export const ScanLoupe = ({ url, photo, box, corner }: ScanLoupeProps) => {
  const x     = photo.x + corner.x * photo.width;
  const y     = photo.y + corner.y * photo.height;
  const place = loupeAt({ x, y, box, size: LOUPE.size, gap: LOUPE.gap });
  const half  = LOUPE.size / 2;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-20 overflow-hidden rounded-full border-2 border-mint bg-bg"
      style={{
        left               : place.left,
        top                : place.top,
        width              : LOUPE.size,
        height             : LOUPE.size,
        backgroundImage    : `url(${url})`,
        backgroundRepeat   : 'no-repeat',
        backgroundSize     : `${photo.width * LOUPE.zoom}px ${photo.height * LOUPE.zoom}px`,
        backgroundPosition : `${half - corner.x * photo.width * LOUPE.zoom}px ${half - corner.y * photo.height * LOUPE.zoom}px`,
      }}
    >
      <span className="absolute top-1/2 left-1/2 h-px w-5 -translate-x-1/2 bg-mint" />
      <span className="absolute top-1/2 left-1/2 h-5 w-px -translate-y-1/2 bg-mint" />
    </span>
  );
};
