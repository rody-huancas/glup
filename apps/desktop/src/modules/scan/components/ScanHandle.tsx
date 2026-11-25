import type { KeyboardEvent, PointerEvent } from 'react';
import { SCAN_TEXTS } from '@/modules/scan/constants/texts';
import type { Point } from '@/shared/interfaces/point';
import { cx } from '@/shared/utils/classNames';

interface ScanHandleProps {
  index         : number;
  corner        : Point;
  // In pixels of the box.
  left          : number;
  top           : number;
  active        : boolean;
  hintId        : string;
  onKeyDown     : (event: KeyboardEvent<HTMLButtonElement>) => void;
  onPointerDown : (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove : (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp   : () => void;
  onBlur        : () => void;
}

// One corner: a round handle that drags, and a real button for the keyboard (Tab, then the arrows).
export const ScanHandle = ({ index, corner, left, top, active, hintId, onKeyDown, onPointerDown, onPointerMove, onPointerUp, onBlur }: ScanHandleProps) => (
  <button
    type="button"
    aria-label={SCAN_TEXTS.cornerAt(SCAN_TEXTS.corners[index], corner.x, corner.y)}
    aria-describedby={hintId}
    onKeyDown={onKeyDown}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    onPointerCancel={onPointerUp}
    onBlur={onBlur}
    className={cx(
      'absolute z-10 size-6 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-mint outline-none transition-[background-color,transform] motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
      active ? 'scale-110 cursor-grabbing bg-mint' : 'bg-bg/70 hover:bg-mint/60',
    )}
    style={{ left, top }}
  />
);
