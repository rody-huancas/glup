import { ChoiceButton } from '@/modules/pdf/components/ChoiceButton';
import { StepHeader } from '@/modules/pdf/components/StepHeader';
import { PAGE_IMAGE_OPTIONS } from '@/modules/pdf/constants/imageFormats';
import { PDF_TEXTS } from '@/modules/pdf/constants/pdf';
import type { PageImageFormat } from '@/modules/pdf/types/pageImageFormat';

interface PageImageStepProps {
  onChoose : (format: PageImageFormat) => void;
  onBack   : () => void;
}

// JPG first: it is the default.
export const PageImageStep = ({ onChoose, onBack }: PageImageStepProps) => (
  <div className="flex flex-col">
    <StepHeader title={PDF_TEXTS.imagesTitle} onBack={onBack} />
    <div className="mt-2.5 grid grid-cols-2 gap-2">
      {PAGE_IMAGE_OPTIONS.map((option) => (
        <ChoiceButton key={option.format} label={option.label} hint={option.hint} onClick={() => onChoose(option.format)} />
      ))}
    </div>
  </div>
);
