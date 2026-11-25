import { ChoiceButton } from '@/modules/pdf/components/ChoiceButton';
import { OptionGroup } from '@/modules/pdf/components/OptionGroup';
import { SUBTITLES_TEXTS } from '@/modules/subtitles/constants/texts';
import { LANGUAGE_LABELS, MAIN_LANGUAGES, OTHER_LANGUAGES, TRANSCRIBE_TEXTS } from '@/modules/transcribe/constants/transcribe';
import { useTranscribeStep } from '@/modules/transcribe/hooks/useTranscribeStep';
import type { TranscribeOptions } from '@/modules/transcribe/interfaces/transcribeOptions';
import { toOptions } from '@/modules/transcribe/utils/transcribe';
import { Button } from '@/shared/components/Button';

interface SubtitlesSetupProps {
  onListen : (options: TranscribeOptions) => void;
}

// The language (Spanish by default, or detected) and Rápido or Más preciso, as in "Pasar audio a texto",
// and under them the one big button of the step.
export const SubtitlesSetup = ({ onListen }: SubtitlesSetupProps) => {
  const step = useTranscribeStep([], 'es');

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-text">{SUBTITLES_TEXTS.setupBody}</p>
      <div className="flex flex-wrap items-end gap-3">
        <OptionGroup label={TRANSCRIBE_TEXTS.language} options={MAIN_LANGUAGES} labels={LANGUAGE_LABELS} value={step.language} onChange={step.setLanguage} />
        {step.language === 'other' && (
          <select
            value={step.other}
            onChange={(event) => step.setOther(OTHER_LANGUAGES.find((code) => code === event.target.value) ?? step.other)}
            aria-label={TRANSCRIBE_TEXTS.otherField}
            className="h-8 rounded-control border border-line-strong bg-surface px-2 text-[12px] text-text outline-none focus:border-fam-media"
          >
            {OTHER_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {LANGUAGE_LABELS[code]}
              </option>
            ))}
          </select>
        )}
      </div>
      <span className="text-[12px] font-semibold text-muted">{TRANSCRIBE_TEXTS.level}</span>
      <div className="grid grid-cols-2 gap-2">
        <ChoiceButton label={TRANSCRIBE_TEXTS.fast} hint={TRANSCRIBE_TEXTS.fastTip} selected={step.level === 'fast'} onClick={() => step.setLevel('fast')} />
        <ChoiceButton label={TRANSCRIBE_TEXTS.precise} hint={TRANSCRIBE_TEXTS.preciseTip} selected={step.level === 'precise'} onClick={() => step.setLevel('precise')} />
      </div>
      {step.estimate && <p className="text-[12px] text-muted">{step.estimate}</p>}
      <Button variant="media" onClick={() => onListen(toOptions(step))} className="mt-1 h-12 w-full text-[15px]">
        {SUBTITLES_TEXTS.listen}
      </Button>
    </div>
  );
};
