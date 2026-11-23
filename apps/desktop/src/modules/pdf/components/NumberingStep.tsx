import { useState } from 'react';
import { NumberField } from '@/modules/pdf/components/NumberField';
import { OptionGroup } from '@/modules/pdf/components/OptionGroup';
import { PagePreview } from '@/modules/pdf/components/PagePreview';
import { PreviewLabel } from '@/modules/pdf/components/PreviewLabel';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { DEFAULT_NUMBERING, NUMBER_FORMAT_LABELS, NUMBER_POSITION_LABELS, NUMBERING_TEXTS } from '@/modules/pdf/constants/numbering';
import type { NumberingOptions } from '@/modules/pdf/interfaces/numberingOptions';
import { lastNumber, numberingProblem, pageLabel, parseWhole } from '@/modules/pdf/utils/numbering';
import { numberPreview } from '@/modules/pdf/utils/stampPreview';
import { Button } from '@/shared/components/Button';

interface NumberingStepProps {
  // The first PDF chosen, for the preview.
  path      : string;
  // Pages of the shortest PDF chosen (null while unknown): numbering cannot start past it.
  total     : number | null;
  onConfirm : (options: NumberingOptions) => void;
  onBack    : () => void;
}

// "Numerar páginas": where, how, from which page (to skip a cover) and from which number, seen on the
// first page that gets a number.
export const NumberingStep = ({ path, total, onConfirm, onBack }: NumberingStepProps) => {
  const [options, setOptions] = useState(DEFAULT_NUMBERING);
  const [startText, setStart] = useState('1');
  const [firstText, setFirst] = useState('1');

  const full    = { ...options, startPage: parseWhole(startText) ?? 0, firstNumber: parseWhole(firstText) ?? 0 };
  const problem = numberingProblem({ options: full, total });
  const submit  = () => !problem && onConfirm(full);
  const shown   = problem ? 1 : full.startPage;
  const label   = pageLabel({ format: full.format, number: full.firstNumber || 1, last: total ? lastNumber(full, total) : full.firstNumber });

  return (
    <div className="flex flex-col">
      <StepHeader title={NUMBERING_TEXTS.title} onBack={onBack} />
      <div className="mt-2.5 flex gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <OptionGroup
            label={NUMBERING_TEXTS.position}
            options={['bottom-center', 'bottom-right', 'top-right']}
            labels={NUMBER_POSITION_LABELS}
            value={options.position}
            onChange={(position) => setOptions({ ...options, position })}
          />
          <OptionGroup
            label={NUMBERING_TEXTS.format}
            options={['number', 'page', 'of-total']}
            labels={NUMBER_FORMAT_LABELS}
            value={options.format}
            onChange={(format) => setOptions({ ...options, format })}
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <NumberField label={NUMBERING_TEXTS.startPage} value={startText} invalid={problem === NUMBERING_TEXTS.badStart(total ?? 1)} onChange={setStart} />
            <NumberField label={NUMBERING_TEXTS.firstNumber} value={firstText} invalid={problem === NUMBERING_TEXTS.badNumber} onChange={setFirst} />
          </div>
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-[12px] text-muted">
              {problem ? <span className="text-[#E58A9A]">{problem}</span> : NUMBERING_TEXTS.startHint}
            </p>
            <Button onClick={submit} disabled={problem !== null} className="h-10 shrink-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100">
              {NUMBERING_TEXTS.button}
            </Button>
          </div>
        </div>
        <PagePreview key={shown} path={path} page={shown} label={NUMBERING_TEXTS.preview(shown)}>
          {(page) => <PreviewLabel text={label} preview={numberPreview({ position: options.position, page })} bold={false} muted={false} />}
        </PagePreview>
      </div>
    </div>
  );
};
