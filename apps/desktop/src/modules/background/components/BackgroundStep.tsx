import { BACKGROUND_OPTIONS } from '@/modules/background/constants/backgroundOptions';
import { BACKGROUND_TEXTS } from '@/modules/background/constants/texts';
import type { BackgroundKind } from '@/modules/background/types/backgroundKind';
import { ChoiceButton } from '@/modules/pdf/components/ChoiceButton';
import { StepHeader } from '@/modules/pdf/components/StepHeader';

interface BackgroundStepProps {
  onChoose : (kind: BackgroundKind) => void;
  onBack   : () => void;
}

// Second step of "Quitar fondo": transparent (the default, first) or white.
export const BackgroundStep = ({ onChoose, onBack }: BackgroundStepProps) => (
  <div className="flex flex-col">
    <StepHeader title={BACKGROUND_TEXTS.choiceTitle} onBack={onBack} />
    <div className="mt-2.5 grid grid-cols-2 gap-2">
      {BACKGROUND_OPTIONS.map((option) => (
        <ChoiceButton key={option.kind} label={option.label} hint={option.hint} onClick={() => onChoose(option.kind)} />
      ))}
    </div>
  </div>
);
