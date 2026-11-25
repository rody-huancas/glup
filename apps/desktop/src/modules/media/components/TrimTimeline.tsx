import { useId, useRef } from 'react';
import type { PointerEvent } from 'react';
import { TrimHandle } from '@/modules/media/components/TrimHandle';
import { TRIM_TEXTS } from '@/modules/media/constants/texts';
import type { Stretch } from '@/modules/media/utils/time';

interface TrimTimelineProps {
  duration : number;
  stretch  : Stretch;
  current  : number;
  strip    : string | null;
  wave     : number[] | null;
  onMove   : (which: 'start' | 'end', to: number) => void;
  onSeek   : (to: number) => void;
}

// The whole file as a line: its frames (video) or the shape of its sound (audio), the chosen stretch
// lit between its two handles, and where the player is. A click on the line takes the player there.
export const TrimTimeline = ({ duration, stretch, current, strip, wave, onMove, onSeek }: TrimTimelineProps) => {
  const line   = useRef<HTMLDivElement | null>(null);
  const hintId = useId();
  const share  = (seconds: number) => (duration > 0 ? Math.min(1, Math.max(0, seconds / duration)) : 0);

  const timeAt = (clientX: number): number => {
    const box = line.current?.getBoundingClientRect();
    return box && box.width > 0 ? ((clientX - box.left) / box.width) * duration : 0;
  };

  const grab = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const drag = (which: 'start' | 'end') => (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) onMove(which, timeAt(event.clientX));
  };

  return (
    <div className="flex flex-col gap-1">
      <span id={hintId} className="sr-only">{TRIM_TEXTS.handleHint}</span>
      <div
        ref={line}
        role="group"
        aria-label={TRIM_TEXTS.timeline}
        onPointerDown={(event) => onSeek(timeAt(event.clientX))}
        className="relative h-16 cursor-pointer overflow-visible rounded-control border border-line bg-bg select-none"
      >
        {strip && <img src={strip} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full rounded-control object-fill opacity-80" />}
        {wave && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" viewBox={`0 0 ${wave.length} 100`} preserveAspectRatio="none">
            {wave.map((bar, index) => <rect key={index} x={index + 0.15} width={0.7} y={50 - Math.max(1, bar * 46)} height={Math.max(2, bar * 92)} fill="var(--color-fam-media)" />)}
          </svg>
        )}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 rounded-l-control bg-scrim" style={{ width: `${share(stretch.start) * 100}%` }} />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 rounded-r-control bg-scrim" style={{ width: `${(1 - share(stretch.end)) * 100}%` }} />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 border-y-2 border-fam-media" style={{ left: `${share(stretch.start) * 100}%`, right: `${(1 - share(stretch.end)) * 100}%` }} />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-text" style={{ left: `${share(current) * 100}%` }} />
        <TrimHandle label={TRIM_TEXTS.startHandle} value={stretch.start} duration={duration} share={share(stretch.start)} hintId={hintId} onMove={(to) => onMove('start', to)} onGrab={grab} onDrag={drag('start')} />
        <TrimHandle label={TRIM_TEXTS.endHandle} value={stretch.end} duration={duration} share={share(stretch.end)} hintId={hintId} onMove={(to) => onMove('end', to)} onGrab={grab} onDrag={drag('end')} />
      </div>
    </div>
  );
};
