import type { MouseEvent, PointerEvent } from 'react';
import { SIGN_TEXTS } from '@/modules/sign/constants/sign';
import { cx } from '@/shared/utils/classNames';

interface PlacementToolbarProps {
  isText      : boolean;
  // Shown under the element when it is too close to the top of the page.
  below       : boolean;
  // Aligned to the element's right edge when it is close to the right of the page.
  alignRight  : boolean;
  onDuplicate : () => void;
  onRepeat    : () => void;
  onRemove    : () => void;
  onSmaller   : () => void;
  onBigger    : () => void;
  onEdit      : () => void;
}

const stop = (event: PointerEvent | MouseEvent) => event.stopPropagation();

const action = 'h-6 cursor-pointer whitespace-nowrap rounded-md px-2 text-[11px] font-semibold text-text transition-colors hover:bg-line';

export const PlacementToolbar = ({ isText, below, alignRight, onDuplicate, onRepeat, onRemove, onSmaller, onBigger, onEdit }: PlacementToolbarProps) => (
  <div
    role="toolbar"
    onPointerDown={stop}
    onDoubleClick={stop}
    className={cx(
      'absolute z-10 flex items-center gap-0.5 rounded-lg border border-line-strong bg-surface p-0.5 shadow-lg',
      below ? 'top-full mt-2' : 'bottom-full mb-2',
      alignRight ? 'right-0' : 'left-0',
    )}
  >
    {isText && (
      <>
        <button type="button" className={action} onClick={onEdit}>{SIGN_TEXTS.edit}</button>
        <button type="button" aria-label={SIGN_TEXTS.smaller} title={SIGN_TEXTS.smaller} className={action} onClick={onSmaller}>A−</button>
        <button type="button" aria-label={SIGN_TEXTS.bigger} title={SIGN_TEXTS.bigger} className={action} onClick={onBigger}>A+</button>
      </>
    )}
    <button type="button" className={action} onClick={onDuplicate}>{SIGN_TEXTS.duplicate}</button>
    <button type="button" className={action} onClick={onRepeat}>{SIGN_TEXTS.repeat}</button>
    <button type="button" className={cx(action, 'text-[#E58A9A]')} onClick={onRemove}>{SIGN_TEXTS.remove}</button>
  </div>
);
