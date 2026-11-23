import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import { ChoiceButton } from '@/modules/pdf/components/ChoiceButton';
import { OptionGroup } from '@/modules/pdf/components/OptionGroup';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { LANGUAGE_LABELS, MAIN_LANGUAGES, OTHER_LANGUAGES, TRANSCRIBE_TEXTS } from '@/modules/transcribe/constants/transcribe';
import { useTranscribeStep } from '@/modules/transcribe/hooks/useTranscribeStep';
import type { TranscribeOptions } from '@/modules/transcribe/interfaces/transcribeOptions';
import { toOptions } from '@/modules/transcribe/utils/transcribe';
import { Button } from '@/shared/components/Button';

interface TranscribeStepProps {
  files   : FileInfo[];
  onStart : (options: TranscribeOptions) => void;
  onBack  : () => void;
}

// The language (detected by default), Rápido or Más preciso (the last one chosen), and the wait.
export const TranscribeStep = ({ files, onStart, onBack }: TranscribeStepProps) => {
  const step = useTranscribeStep(files);

  return (
    <div className="flex flex-col">
      <StepHeader title={TRANSCRIBE_TEXTS.title} onBack={onBack} />
      <div className="mt-2.5 flex flex-wrap items-end gap-3">
        <OptionGroup label={TRANSCRIBE_TEXTS.language} options={MAIN_LANGUAGES} labels={LANGUAGE_LABELS} value={step.language} onChange={step.setLanguage} />
        {step.language === 'other' && (
          <select
            value={step.other}
            onChange={(event) => step.setOther(OTHER_LANGUAGES.find((code) => code === event.target.value) ?? step.other)}
            aria-label={TRANSCRIBE_TEXTS.otherField}
            className="h-8 rounded-control border border-line-strong bg-raised px-2 text-[12px] text-text outline-none focus:border-lilac"
          >
            {OTHER_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {LANGUAGE_LABELS[code]}
              </option>
            ))}
          </select>
        )}
      </div>
      <span className="mt-2.5 text-[12px] font-semibold text-muted">{TRANSCRIBE_TEXTS.level}</span>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <ChoiceButton label={TRANSCRIBE_TEXTS.fast} hint={TRANSCRIBE_TEXTS.fastTip} selected={step.level === 'fast'} onClick={() => step.setLevel('fast')} />
        <ChoiceButton label={TRANSCRIBE_TEXTS.precise} hint={TRANSCRIBE_TEXTS.preciseTip} selected={step.level === 'precise'} onClick={() => step.setLevel('precise')} />
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[12px] text-muted">{step.estimate ?? TRANSCRIBE_TEXTS.local}</p>
        <Button onClick={() => onStart(toOptions(step))} className="h-10 shrink-0">
          {TRANSCRIBE_TEXTS.start}
        </Button>
      </div>
    </div>
  );
};
