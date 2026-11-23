import { ChoiceButton } from '@/modules/pdf/components/ChoiceButton';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { useTargetSize } from '@/modules/pdf/hooks/useTargetSize';
import { VIDEO_TEXTS } from '@/modules/video/constants/texts';
import { useVideoPlans } from '@/modules/video/hooks/useVideoPlans';
import type { VideoOptions } from '@/modules/video/interfaces/videoOptions';
import { planEstimate, planWarning } from '@/modules/video/utils/planWarning';
import { Button } from '@/shared/components/Button';
import { cx } from '@/shared/utils/classNames';

interface VideoGoalStepProps {
  paths    : string[];
  onReduce : (options: VideoOptions) => void;
  onBack   : () => void;
}

const EMAIL: VideoOptions = { goal: 'email', targetBytes: null };

// "¿Para qué es?": WhatsApp, correo (warned before starting if it cannot get under 25 MB), the
// lightest, or a size typed by the person.
export const VideoGoalStep = ({ paths, onReduce, onBack }: VideoGoalStepProps) => {
  const target      = useTargetSize();
  const typed       = target.valid && target.bytes !== null;
  const custom      = { goal: 'target', targetBytes: target.bytes } as const;
  const emailPlans  = useVideoPlans({ paths, options: EMAIL, enabled: true });
  const customPlans = useVideoPlans({ paths, options: custom, enabled: typed });

  const emailWarning  = emailPlans ? planWarning(emailPlans, 'email') : null;
  const customWarning = customPlans ? planWarning(customPlans, 'target') : null;
  const customHint    = customPlans ? customWarning ?? planEstimate(customPlans) : typed ? VIDEO_TEXTS.reading : null;

  return (
    <div className="flex flex-col">
      <StepHeader title={VIDEO_TEXTS.title} onBack={onBack} />
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <ChoiceButton label={VIDEO_TEXTS.whatsapp} hint={VIDEO_TEXTS.whatsappTip} onClick={() => onReduce({ goal: 'whatsapp', targetBytes: null })} />
        <ChoiceButton label={VIDEO_TEXTS.email} hint={VIDEO_TEXTS.emailTip} onClick={() => onReduce(EMAIL)} />
        <ChoiceButton label={VIDEO_TEXTS.lightest} hint={VIDEO_TEXTS.lightestTip} onClick={() => onReduce({ goal: 'lightest', targetBytes: null })} />
      </div>
      {emailWarning && <p className="mt-2 text-[12px] text-warn">{emailWarning}</p>}
      <div className="mt-2.5 flex items-center gap-2 text-[13px] text-muted">
        {VIDEO_TEXTS.targetLabel}
        <input
          value={target.text}
          onChange={(event) => target.write(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && typed && onReduce(custom)}
          inputMode="decimal"
          aria-label={VIDEO_TEXTS.targetField}
          aria-invalid={!target.valid}
          className={cx(
            'h-8 w-20 rounded-control border bg-raised px-2 text-[13px] text-text outline-none focus:border-lilac',
            target.valid ? 'border-line-strong' : 'border-[#E58A9A]',
          )}
        />
        {VIDEO_TEXTS.targetUnit}
        <Button variant="secondary" onClick={() => onReduce(custom)} disabled={!typed} className="ml-auto h-8 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-45">
          {VIDEO_TEXTS.targetGo}
        </Button>
      </div>
      {customHint && <p className={cx('mt-1 text-[11px]', customWarning ? 'text-warn' : 'text-muted')}>{customHint}</p>}
    </div>
  );
};
