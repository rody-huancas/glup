import type { FormatOption } from '@/modules/actions/interfaces/formatOption';
import type { ImageFormat } from '@/modules/actions/types/imageFormat';
import { ACTIONS_TEXTS } from '@/modules/actions/constants/texts';
import { cx } from '@/shared/utils/classNames';

interface FormatButtonProps {
  option   : FormatOption;
  disabled : boolean;
  onChoose : (format: ImageFormat) => void;
}

export const FormatButton = ({ option, disabled, onChoose }: FormatButtonProps) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChoose(option.format)}
    className={cx(
      'flex h-[52px] min-w-0 flex-col items-start justify-center rounded-control border px-3 text-left transition-colors',
      disabled ? 'cursor-default border-line bg-surface opacity-50' : 'cursor-pointer border-line-strong bg-raised hover:bg-line',
    )}
  >
    <span className="text-[13px] font-semibold text-text">{option.label}</span>
    <span className="w-full truncate text-[11px] text-muted">{disabled ? ACTIONS_TEXTS.sameFormat : option.hint}</span>
  </button>
);
