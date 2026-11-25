import type { ReactNode } from 'react';
import { OptionGroup } from '@/modules/pdf/components/OptionGroup';
import { DATE_FORMATS, RENAME_TEXTS } from '@/modules/rename/constants/texts';
import type { RenameCase, RenameRule, RenameSide } from '@/modules/rename/interfaces/renameRule';
import { Switch } from '@/shared/components/Switch';

interface RuleCardProps {
  rule     : RenameRule;
  index    : number;
  last     : boolean;
  onChange : (next: Partial<RenameRule>) => void;
  onMove   : (to: number) => void;
  onRemove : () => void;
}

const field  = 'h-8 rounded-control border border-line-strong bg-bg px-2 text-[13px] text-text outline-none focus:border-fam-pc';
const small  = 'cursor-pointer rounded-control px-2 py-1 text-[11px] font-semibold text-fam-pc outline-none hover:bg-surface hover:text-text focus-visible:ring-2 focus-visible:ring-fam-pc disabled:cursor-default disabled:opacity-40';
const SIDES: RenameSide[] = ['start', 'end'];
const CASES: RenameCase[] = ['lower', 'upper', 'sentence'];

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-muted">{label}{children}</label>
);

// One rule with its fields; it moves up or down (the order matters) or goes.
export const RuleCard = ({ rule, index, last, onChange, onMove, onRemove }: RuleCardProps) => {
  const number = (value: string, fallback: number) => (Number.isFinite(Number(value)) && value !== '' ? Number(value) : fallback);

  return (
    <li className="flex flex-col gap-2 rounded-control border border-line bg-raised p-3">
      <div className="flex items-center gap-1">
        <span className="flex-1 text-[12px] font-semibold text-text">{index + 1}. {RENAME_TEXTS.kinds[rule.kind]}</span>
        <button type="button" className={small} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={RENAME_TEXTS.up}>↑</button>
        <button type="button" className={small} disabled={last} onClick={() => onMove(index + 1)} aria-label={RENAME_TEXTS.down}>↓</button>
        <button type="button" className={small} onClick={onRemove}>{RENAME_TEXTS.remove}</button>
      </div>
      {rule.kind === 'number' && (
        <div className="flex flex-wrap gap-2">
          <Field label={RENAME_TEXTS.text}><input className={`${field} w-48`} value={rule.text} onChange={(event) => onChange({ text: event.target.value })} title={RENAME_TEXTS.numberHint} /></Field>
          <Field label={RENAME_TEXTS.digits}><input type="number" min={1} max={9} className={`${field} w-16`} value={rule.digits} onChange={(event) => onChange({ digits: number(event.target.value, 1) })} /></Field>
          <Field label={RENAME_TEXTS.start}><input type="number" className={`${field} w-20`} value={rule.start} onChange={(event) => onChange({ start: number(event.target.value, 1) })} /></Field>
          <Field label={RENAME_TEXTS.step}><input type="number" className={`${field} w-16`} value={rule.step} onChange={(event) => onChange({ step: number(event.target.value, 1) })} /></Field>
          <p className="w-full text-[11px] text-muted">{RENAME_TEXTS.numberHint}</p>
        </div>
      )}
      {rule.kind === 'replace' && (
        <div className="flex flex-wrap items-end gap-2">
          <Field label={RENAME_TEXTS.find}><input className={`${field} w-40`} value={rule.find} onChange={(event) => onChange({ find: event.target.value })} /></Field>
          <Field label={RENAME_TEXTS.with}><input className={`${field} w-40`} value={rule.with} onChange={(event) => onChange({ with: event.target.value })} /></Field>
          <Switch accent="pc" label={RENAME_TEXTS.caseSensitive} checked={rule.caseSensitive} onChange={(caseSensitive) => onChange({ caseSensitive })} />
        </div>
      )}
      {rule.kind === 'add' && (
        <div className="flex flex-wrap items-end gap-3">
          <Field label={RENAME_TEXTS.text}><input className={`${field} w-48`} value={rule.text} onChange={(event) => onChange({ text: event.target.value })} /></Field>
          <OptionGroup label={RENAME_TEXTS.side} options={SIDES} labels={RENAME_TEXTS.sides} value={rule.side} onChange={(side) => onChange({ side })} />
        </div>
      )}
      {rule.kind === 'removeChars' && <Field label={RENAME_TEXTS.chars}><input className={`${field} w-40`} value={rule.chars} onChange={(event) => onChange({ chars: event.target.value })} /></Field>}
      {rule.kind === 'removeRange' && (
        <div className="flex flex-wrap items-end gap-2">
          <Field label={RENAME_TEXTS.from}><input type="number" min={1} className={`${field} w-20`} value={rule.from} onChange={(event) => onChange({ from: number(event.target.value, 1) })} /></Field>
          <Field label={RENAME_TEXTS.count}><input type="number" min={0} className={`${field} w-20`} value={rule.count} onChange={(event) => onChange({ count: number(event.target.value, 0) })} /></Field>
          <Switch accent="pc" label={RENAME_TEXTS.fromEnd} checked={rule.fromEnd} onChange={(fromEnd) => onChange({ fromEnd })} />
        </div>
      )}
      {rule.kind === 'case' && <OptionGroup label={RENAME_TEXTS.kinds.case} options={CASES} labels={RENAME_TEXTS.cases} value={rule.case} onChange={(value) => onChange({ case: value })} />}
      {rule.kind === 'date' && (
        <div className="flex flex-wrap items-end gap-3">
          <OptionGroup label={RENAME_TEXTS.format} options={DATE_FORMATS} labels={Object.fromEntries(DATE_FORMATS.map((format) => [format, format.replace('YYYY', '2026').replace('MM', '11').replace('DD', '25').replace('HH', '14').replace('mm', '30')]))} value={rule.format} onChange={(format) => onChange({ format })} />
          <OptionGroup label={RENAME_TEXTS.side} options={SIDES} labels={RENAME_TEXTS.sides} value={rule.side} onChange={(side) => onChange({ side })} />
          <Field label={RENAME_TEXTS.separator}><input className={`${field} w-16`} value={rule.separator} onChange={(event) => onChange({ separator: event.target.value })} /></Field>
          <p className="w-full text-[11px] text-muted">{RENAME_TEXTS.dateHint}</p>
        </div>
      )}
    </li>
  );
};
