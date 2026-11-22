import { FormatButton } from '@/modules/actions/components/FormatButton';
import { FORMAT_OPTIONS } from '@/modules/actions/constants/formats';
import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import type { ImageFormat } from '@/modules/actions/types/imageFormat';
import { isSameFormat } from '@/modules/actions/utils/formats';
import { ChevronLeftIcon } from '@/shared/icons/ChevronLeftIcon';

interface FormatPickerProps {
  selection : FileSelection;
  onChoose  : (format: ImageFormat) => void;
  onBack    : () => void;
}

// Second step of "Convertir": the target format.
export const FormatPicker = ({ selection, onChoose, onBack }: FormatPickerProps) => (
  <div className="flex flex-col">
    <div className="mt-3 flex items-center justify-between">
      <h2 className="text-[15px] font-semibold text-text">{ACTIONS_TEXTS.formatsTitle}</h2>
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-1 text-[13px] font-semibold text-lilac hover:text-lilac-soft"
      >
        <ChevronLeftIcon className="size-4" />
        {ACTIONS_TEXTS.back}
      </button>
    </div>
    <div className="mt-2.5 grid grid-cols-5 gap-2">
      {FORMAT_OPTIONS.map((option) => (
        <FormatButton
          key={option.format}
          option={option}
          disabled={isSameFormat(selection, option.format)}
          onChoose={onChoose}
        />
      ))}
    </div>
  </div>
);
