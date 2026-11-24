import { ChoiceButton } from '@/modules/pdf/components/ChoiceButton';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { JPG_QUALITY_OPTIONS, PHOTO_TEXTS } from '@/modules/photos/constants/photos';
import type { JpgQuality } from '@/modules/photos/types/jpgQuality';

interface JpgQualityStepProps {
  onChoose : (quality: JpgQuality) => void;
  onBack   : () => void;
}

// "Fotos de iPhone a JPG": Normal first, it is the default.
export const JpgQualityStep = ({ onChoose, onBack }: JpgQualityStepProps) => (
  <div className="flex flex-col">
    <StepHeader title={PHOTO_TEXTS.qualityTitle} onBack={onBack} />
    <div className="mt-2.5 grid grid-cols-3 gap-2">
      {JPG_QUALITY_OPTIONS.map((option) => (
        <ChoiceButton key={option.quality} label={option.label} hint={option.hint} onClick={() => onChoose(option.quality)} />
      ))}
    </div>
  </div>
);
