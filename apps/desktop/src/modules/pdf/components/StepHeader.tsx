import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import { ChevronLeftIcon } from '@/shared/icons/ChevronLeftIcon';

interface StepHeaderProps {
  title  : string;
  onBack : () => void;
}

export const StepHeader = ({ title, onBack }: StepHeaderProps) => (
  <div className="mt-3 flex items-center justify-between">
    <h2 className="text-[15px] font-semibold text-text">{title}</h2>
    <button
      type="button"
      onClick={onBack}
      className="flex cursor-pointer items-center gap-1 text-[13px] font-semibold text-lilac hover:text-lilac-soft"
    >
      <ChevronLeftIcon className="size-4" />
      {ACTIONS_TEXTS.back}
    </button>
  </div>
);
