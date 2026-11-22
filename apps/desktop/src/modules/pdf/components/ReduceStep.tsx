import { ChoiceButton } from '@/modules/pdf/components/ChoiceButton';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { REDUCE_CHOICES, REDUCE_TEXTS } from '@/modules/pdf/constants/reduce';
import { useTargetSize } from '@/modules/pdf/hooks/useTargetSize';
import type { ReduceOptions } from '@/modules/pdf/interfaces/reduceOptions';
import type { ReduceLevel } from '@/modules/pdf/types/reduceLevel';
import { cx } from '@/shared/utils/classNames';

interface ReduceStepProps {
  // The level remembered from last time, marked.
  lastLevel : ReduceLevel;
  onReduce  : (options: ReduceOptions) => void;
  onBack    : () => void;
}

// "Reducir peso" for PDFs: Normal or Al máximo, and optionally a size the result must stay under.
export const ReduceStep = ({ lastLevel, onReduce, onBack }: ReduceStepProps) => {
  const target = useTargetSize();

  return (
    <div className="flex flex-col">
      <StepHeader title={REDUCE_TEXTS.title} onBack={onBack} />
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {REDUCE_CHOICES.map((choice) => (
          <ChoiceButton
            key={choice.level}
            label={choice.label}
            hint={choice.hint}
            selected={choice.level === lastLevel}
            disabled={!target.valid}
            onClick={() => onReduce({ level: choice.level, targetBytes: target.bytes })}
          />
        ))}
      </div>
      <label className="mt-2.5 flex items-center gap-2 text-[13px] text-muted">
        {REDUCE_TEXTS.targetLabel}
        <input
          value={target.text}
          onChange={(event) => target.write(event.target.value)}
          inputMode="decimal"
          aria-label={REDUCE_TEXTS.targetField}
          aria-invalid={!target.valid}
          className={cx(
            'h-8 w-20 rounded-control border bg-raised px-2 text-[13px] text-text outline-none focus:border-lilac',
            target.valid ? 'border-line-strong' : 'border-[#E58A9A]',
          )}
        />
        {REDUCE_TEXTS.targetUnit}
      </label>
      {!target.valid && <span className="mt-1 text-[11px] text-[#E58A9A]">{REDUCE_TEXTS.targetError}</span>}
    </div>
  );
};
