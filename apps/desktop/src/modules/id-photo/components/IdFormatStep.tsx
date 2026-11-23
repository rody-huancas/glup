import { useState } from 'react';
import { ID_FORMATS, ID_PHOTO_TEXTS } from '@/modules/id-photo/constants/idPhoto';
import type { IdChoice } from '@/modules/id-photo/interfaces/idChoice';
import type { IdKind } from '@/modules/id-photo/types/idKind';
import { choiceProblem, customSizeProblem, parseCm } from '@/modules/id-photo/utils/customSize';
import { ChoiceButton } from '@/modules/pdf/components/ChoiceButton';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { Button } from '@/shared/components/Button';
import { Checkbox } from '@/shared/components/Checkbox';
import { cx } from '@/shared/utils/classNames';

interface IdFormatStepProps {
  onNext : (choice: IdChoice) => void;
  onBack : () => void;
}

// "¿Para qué es?": the size (pasaporte by default, cuadrada or one typed) and which files to make.
export const IdFormatStep = ({ onNext, onBack }: IdFormatStepProps) => {
  const [kind, setKind]     = useState<IdKind>('passport');
  const [width, setWidth]   = useState('3,5');
  const [height, setHeight] = useState('4,5');
  const [photo, setPhoto]   = useState(true);
  const [sheet, setSheet]   = useState(true);

  const custom  = kind === 'custom';
  const format  = custom ? { kind, widthCm: parseCm(width) ?? 0, heightCm: parseCm(height) ?? 0 } : ID_FORMATS[kind];
  const choice  = { format, outputs: { photo, sheet } };
  const problem = (custom ? customSizeProblem({ width, height }) : null) ?? choiceProblem(choice);

  const field = (label: string, value: string, onChange: (value: string) => void) => (
    <label className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        aria-invalid={problem === ID_PHOTO_TEXTS.badSize}
        className={cx(
          'h-8 w-14 rounded-control border bg-raised px-2 text-center text-[13px] font-normal text-text outline-none focus:border-lilac',
          problem === ID_PHOTO_TEXTS.badSize ? 'border-[#E58A9A]' : 'border-line-strong',
        )}
      />
      {ID_PHOTO_TEXTS.unit}
    </label>
  );

  return (
    <div className="flex flex-col">
      <StepHeader title={ID_PHOTO_TEXTS.formatTitle} onBack={onBack} />
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <ChoiceButton label={ID_PHOTO_TEXTS.passport} hint={ID_PHOTO_TEXTS.passportTip} selected={kind === 'passport'} onClick={() => setKind('passport')} />
        <ChoiceButton label={ID_PHOTO_TEXTS.square} hint={ID_PHOTO_TEXTS.squareTip} selected={kind === 'square'} onClick={() => setKind('square')} />
        <ChoiceButton label={ID_PHOTO_TEXTS.custom} hint={ID_PHOTO_TEXTS.customTip} selected={custom} onClick={() => setKind('custom')} />
      </div>
      {custom && (
        <div className="mt-2 flex gap-4">
          {field(ID_PHOTO_TEXTS.width, width, setWidth)}
          {field(ID_PHOTO_TEXTS.height, height, setHeight)}
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <span className="text-[12px] font-semibold text-muted">{ID_PHOTO_TEXTS.outputs}</span>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text">
          <Checkbox label={ID_PHOTO_TEXTS.photo} checked={photo} onChange={setPhoto} />
          {ID_PHOTO_TEXTS.photo}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-text">
          <Checkbox label={ID_PHOTO_TEXTS.sheet} checked={sheet} onChange={setSheet} />
          {ID_PHOTO_TEXTS.sheet}
        </label>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[11px] text-muted">{problem ? <span className="text-[#E58A9A]">{problem}</span> : ID_PHOTO_TEXTS.note}</p>
        <Button onClick={() => onNext(choice)} disabled={problem !== null} className="h-10 shrink-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100">
          {ID_PHOTO_TEXTS.next}
        </Button>
      </div>
    </div>
  );
};
