import type { KeyboardEvent, PointerEvent } from 'react';
import { SCAN_TEXTS } from '@/modules/scan/constants/texts';
import type { ScanSheet } from '@/modules/scan/interfaces/scanSheet';
import { isConvexQuad } from '@/modules/scan/utils/corners';
import { CloseIcon } from '@/shared/icons/CloseIcon';
import { RotateLeftIcon } from '@/shared/icons/RotateLeftIcon';
import { RotateRightIcon } from '@/shared/icons/RotateRightIcon';
import { cx } from '@/shared/utils/classNames';

interface ScanThumbProps {
  sheet         : ScanSheet;
  index         : number;
  current       : boolean;
  dragging      : boolean;
  dropBefore    : boolean;
  onChoose      : () => void;
  onTurn        : (direction: 'left' | 'right') => void;
  onRemove      : () => void;
  onMoveKey     : (step: number) => void;
  onPointerDown : (event: PointerEvent<HTMLElement>) => void;
  onPointerMove : (event: PointerEvent<HTMLElement>) => void;
  onPointerUp   : (event: PointerEvent<HTMLElement>) => void;
  takeClick     : () => boolean;
}

const SMALL_BUTTON = 'flex size-6 cursor-pointer items-center justify-center rounded-md bg-bg/85 text-muted outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-lilac';

// One sheet of the strip: its photo turned as it will come out, its number, and turn and remove buttons
// (on hover or focus). It drags sideways to change the order; Alt and the arrows do it too.
export const ScanThumb = ({ sheet, index, current, dragging, dropBefore, onChoose, onTurn, onRemove, onMoveKey, onPointerDown, onPointerMove, onPointerUp, takeClick }: ScanThumbProps) => {
  const number = index + 1;
  const bad    = sheet.status === 'failed' || (sheet.status === 'ready' && !isConvexQuad(sheet.corners, sheet.width, sheet.height));

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    onMoveKey(event.key === 'ArrowLeft' ? -1 : 1);
  };

  return (
    <li className={cx('group relative shrink-0', dragging && 'opacity-50')}>
      {dropBefore && <span aria-hidden className="absolute inset-y-1 -left-1.5 w-0.5 rounded-full bg-mint" />}
      <button
        type="button"
        aria-current={current ? 'true' : undefined}
        aria-label={SCAN_TEXTS.sheet(number, sheet.name)}
        title={SCAN_TEXTS.move}
        onClick={() => takeClick() && onChoose()}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cx(
          'relative flex h-[76px] w-[64px] cursor-pointer touch-none items-center justify-center overflow-hidden rounded-control border-2 bg-bg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lilac',
          current ? 'border-mint' : bad ? 'border-danger/70' : 'border-line hover:border-line-strong',
        )}
      >
        {sheet.url ? (
          <img src={sheet.url} alt="" draggable={false} className="pointer-events-none max-h-full max-w-full object-contain transition-transform motion-reduce:transition-none" style={{ transform: `rotate(${sheet.rotation}deg)` }} />
        ) : (
          <span className="size-full animate-pulse bg-raised" />
        )}
        <span className="absolute bottom-0.5 left-0.5 rounded bg-bg/85 px-1 text-[10px] font-bold text-text">{number}</span>
      </button>
      <span className="absolute top-0.5 right-0.5 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
        <button type="button" aria-label={SCAN_TEXTS.removeOf(number)} title={SCAN_TEXTS.remove} onClick={onRemove} className={SMALL_BUTTON}>
          <CloseIcon className="size-3.5" />
        </button>
        <button type="button" aria-label={`${SCAN_TEXTS.turnRight} (${number})`} title={SCAN_TEXTS.turnRight} onClick={() => onTurn('right')} className={SMALL_BUTTON}>
          <RotateRightIcon className="size-3.5" />
        </button>
        <button type="button" aria-label={`${SCAN_TEXTS.turnLeft} (${number})`} title={SCAN_TEXTS.turnLeft} onClick={() => onTurn('left')} className={SMALL_BUTTON}>
          <RotateLeftIcon className="size-3.5" />
        </button>
      </span>
    </li>
  );
};
