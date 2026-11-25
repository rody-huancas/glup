import { PLAYER_TEXTS } from '@/modules/media/constants/texts';
import { formatClock } from '@/modules/media/utils/time';

interface PlayerControlsProps {
  current  : number;
  duration : number;
  playing  : boolean;
  onToggle : () => void;
  onSeek   : (to: number) => void;
}

// Under the picture, never over it: play or pause, where it is on a bar, and the time.
export const PlayerControls = ({ current, duration, playing, onToggle, onSeek }: PlayerControlsProps) => (
  <div className="flex shrink-0 items-center gap-2.5">
    <button
      type="button"
      onClick={onToggle}
      aria-label={playing ? PLAYER_TEXTS.pause : PLAYER_TEXTS.play}
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-fam-media text-fam-media-ink outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-fam-media focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor">
        {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5.5v13l10.5-6.5z" />}
      </svg>
    </button>
    <input
      type="range"
      min={0}
      max={duration || 0}
      step={0.1}
      value={Math.min(current, duration || 0)}
      onChange={(event) => onSeek(Number(event.target.value))}
      aria-label={PLAYER_TEXTS.position}
      aria-valuetext={formatClock(current)}
      className="h-1.5 min-w-0 flex-1 cursor-pointer accent-fam-media"
    />
    <span className="shrink-0 font-mono text-[12px] text-muted tabular-nums">
      {formatClock(current)} / {formatClock(duration)}
    </span>
  </div>
);
