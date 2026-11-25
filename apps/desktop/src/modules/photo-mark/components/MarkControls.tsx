import { useId } from 'react';
import { getFileName } from '@/modules/actions/utils/paths';
import { PlacePicker } from '@/modules/photo-mark/components/PlacePicker';
import { FONT_LABELS, FONTS, MARK_TEXTS } from '@/modules/photo-mark/constants/texts';
import type { MarkOptions } from '@/modules/photo-mark/interfaces/markOptions';
import type { MarkKind } from '@/modules/photo-mark/types/markTypes';
import { Button } from '@/shared/components/Button';
import { ChoiceCard } from '@/shared/components/ChoiceCard';
import { Switch } from '@/shared/components/Switch';

interface MarkControlsProps {
  options    : MarkOptions;
  onChange   : (next: Partial<MarkOptions>) => void;
  onLogo     : () => void;
}

const KINDS: MarkKind[] = ['text', 'logo'];
const field = 'h-9 rounded-control border border-line-strong bg-raised px-2 text-[13px] text-text outline-none focus:border-fam-images';

// Text (its letter, colour and shadow) or logo; where; how big and how visible.
export const MarkControls = ({ options, onChange, onLogo }: MarkControlsProps) => {
  const kindId = useId();

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span id={kindId} className="text-[11px] font-semibold text-muted">{MARK_TEXTS.kind}</span>
        <div role="radiogroup" aria-labelledby={kindId} className="grid grid-cols-2 gap-2">
          {KINDS.map((kind) => <ChoiceCard key={kind} accent="images" label={MARK_TEXTS.kinds[kind].label} hint={MARK_TEXTS.kinds[kind].hint} selected={options.kind === kind} onChoose={() => onChange({ kind })} />)}
        </div>
      </div>
      {options.kind === 'text' ? (
        <>
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
            {MARK_TEXTS.text}
            <input value={options.text} onChange={(event) => onChange({ text: event.target.value })} placeholder={MARK_TEXTS.placeholder} className={field} />
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-40 flex-1 flex-col gap-1 text-[11px] font-semibold text-muted">
              {MARK_TEXTS.font}
              <select value={options.font} onChange={(event) => onChange({ font: FONTS.find((font) => font === event.target.value) ?? options.font })} className={field}>
                {FONTS.map((font) => <option key={font} value={font}>{FONT_LABELS[font]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
              {MARK_TEXTS.color}
              <input type="color" value={options.color} onChange={(event) => onChange({ color: event.target.value })} className="h-9 w-16 cursor-pointer rounded-control border border-line-strong bg-raised" />
            </label>
          </div>
          <Switch accent="images" label={MARK_TEXTS.shadow} hint={MARK_TEXTS.shadowHint} checked={options.shadow} onChange={(shadow) => onChange({ shadow })} />
        </>
      ) : (
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onLogo} className="h-9 shrink-0 px-3 text-[12px]">{options.logo ? MARK_TEXTS.changeLogo : MARK_TEXTS.chooseLogo}</Button>
          {options.logo && <span className="min-w-0 truncate text-[12px] text-muted" title={options.logo}>{getFileName(options.logo)}</span>}
        </div>
      )}
      <PlacePicker value={options.place} onChange={(place) => onChange({ place })} />
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
        <span className="flex justify-between">{MARK_TEXTS.size}<span className="tabular-nums">{MARK_TEXTS.percent(options.size)}</span></span>
        <input type="range" min={0.02} max={0.3} step={0.005} value={options.size} onChange={(event) => onChange({ size: Number(event.target.value) })} className="cursor-pointer accent-fam-images" />
      </label>
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
        <span className="flex justify-between">{MARK_TEXTS.opacity}<span className="tabular-nums">{MARK_TEXTS.percent(options.opacity)}</span></span>
        <input type="range" min={0.1} max={1} step={0.05} value={options.opacity} onChange={(event) => onChange({ opacity: Number(event.target.value) })} className="cursor-pointer accent-fam-images" />
      </label>
    </>
  );
};
