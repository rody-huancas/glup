import { useRef } from 'react';
import { TrimTimeField } from '@/modules/media/components/TrimTimeField';
import { formatTime } from '@/modules/media/utils/time';
import { SUBTITLES_TEXTS } from '@/modules/subtitles/constants/texts';
import type { Cue } from '@/modules/subtitles/interfaces/cue';
import { cx } from '@/shared/utils/classNames';

interface CueRowProps {
  cue      : Cue;
  index    : number;
  current  : boolean;
  last     : boolean;
  onFocus  : () => void;
  onText   : (text: string) => void;
  onTime   : (which: 'start' | 'end', seconds: number) => void;
  onMerge  : () => void;
  onSplit  : (at?: number) => void;
  onRemove : () => void;
}

const action = 'cursor-pointer rounded-control px-2 py-1 text-[11px] font-semibold text-lilac hover:bg-surface hover:text-lilac-soft focus-visible:ring-2 focus-visible:ring-lilac outline-none';

// One phrase: its times, its text to correct, and joining, splitting or removing it. Going into it
// takes the video to its start.
export const CueRow = ({ cue, index, current, last, onFocus, onText, onTime, onMerge, onSplit, onRemove }: CueRowProps) => {
  const field = useRef<HTMLTextAreaElement | null>(null);

  return (
    <li
      aria-current={current || undefined}
      onFocus={onFocus}
      className={cx('flex flex-col gap-1.5 rounded-control border p-2', current ? 'border-fam-media bg-raised' : 'border-line bg-surface')}
    >
      <div className="flex items-end gap-2">
        <button type="button" onClick={onFocus} className={cx(action, 'font-mono tabular-nums')} aria-label={SUBTITLES_TEXTS.goTo(formatTime(cue.start / 1000))}>
          {index + 1}
        </button>
        <TrimTimeField label={SUBTITLES_TEXTS.start} value={cue.start / 1000} onChange={(seconds) => onTime('start', seconds)} />
        <TrimTimeField label={SUBTITLES_TEXTS.end} value={cue.end / 1000} onChange={(seconds) => onTime('end', seconds)} />
      </div>
      <textarea
        ref={field}
        value={cue.text}
        rows={2}
        onChange={(event) => onText(event.target.value)}
        aria-label={SUBTITLES_TEXTS.text(index + 1)}
        className="resize-none rounded-control border border-line-strong bg-raised px-2 py-1 text-[13px] text-text outline-none focus:border-lilac"
      />
      <div className="flex flex-wrap gap-1">
        <button type="button" className={action} onClick={() => onSplit(field.current?.selectionStart)} title={SUBTITLES_TEXTS.splitHint}>{SUBTITLES_TEXTS.split}</button>
        {!last && <button type="button" className={action} onClick={onMerge}>{SUBTITLES_TEXTS.merge}</button>}
        <button type="button" className={action} onClick={onRemove}>{SUBTITLES_TEXTS.remove}</button>
      </div>
    </li>
  );
};
