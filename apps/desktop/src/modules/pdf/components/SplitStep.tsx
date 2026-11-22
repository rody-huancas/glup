import { ChoiceButton } from '@/modules/pdf/components/ChoiceButton';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { PDF_TEXTS } from '@/modules/pdf/constants/pdf';

interface SplitStepProps {
  onSplitAll : () => void;
  onPick     : () => void;
  onBack     : () => void;
}

export const SplitStep = ({ onSplitAll, onPick, onBack }: SplitStepProps) => (
  <div className="flex flex-col">
    <StepHeader title={PDF_TEXTS.splitTitle} onBack={onBack} />
    <div className="mt-2.5 grid grid-cols-2 gap-2">
      <ChoiceButton label={PDF_TEXTS.splitAll} hint={PDF_TEXTS.splitAllHint} onClick={onSplitAll} />
      <ChoiceButton label={PDF_TEXTS.splitPick} hint={PDF_TEXTS.splitPickHint} onClick={onPick} />
    </div>
  </div>
);
