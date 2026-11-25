import type { KeyboardEvent, PointerEvent } from 'react';
import { TRIM_STEPS, TRIM_TEXTS } from '@/modules/media/constants/texts';
import { formatTime } from '@/modules/media/utils/time';
import { cx } from '@/shared/utils/classNames';

interface TrimHandleProps {
  label    : string;
  value    : number;
  duration : number;
  // From 0 to 1 along the line.
  share    : number;
  hintId   : string;
  onMove   : (to: number) => void;
  onGrab   : (event: PointerEvent<HTMLButtonElement>) => void;
  onDrag   : (event: PointerEvent<HTMLButtonElement>) => void;
}

// One end of the stretch: a slider for the keyboard (arrows, Shift for bigger steps, Home and End).
export const TrimHandle = ({ label, value, duration, share, hintId, onMove, onGrab, onDrag }: TrimHandleProps) => {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? TRIM_STEPS.big : TRIM_STEPS.small;
    const to   = { ArrowLeft: value - step, ArrowDown: value - step, ArrowRight: value + step, ArrowUp: value + step, Home: 0, End: duration }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    onMove(to);
  };

  return (
    <button
      type="button"
      role="slider"
      aria-label={label}
      aria-describedby={hintId}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration * 10) / 10}
      aria-valuenow={Math.round(value * 10) / 10}
      aria-valuetext={formatTime(value)}
      title={TRIM_TEXTS.handleHint}
      onKeyDown={onKeyDown}
      onPointerDown={onGrab}
      onPointerMove={onDrag}
      className={cx(
        'absolute top-0 z-10 flex h-full w-3 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center rounded-sm bg-mint outline-none',
        'focus-visible:ring-2 focus-visible:ring-lilac focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
      )}
      style={{ left: `${share * 100}%` }}
    >
      <span aria-hidden className="h-5 w-0.5 rounded-full bg-mint-ink/60" />
    </button>
  );
};
