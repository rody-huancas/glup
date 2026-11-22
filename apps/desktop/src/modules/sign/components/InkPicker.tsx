import { CREATE_TEXTS, INK_COLORS, INK_LABELS } from '@/modules/sign/constants/sign';
import type { CSSProperties } from 'react';
import type { InkColor } from '@/modules/sign/types/inkColor';
import { cx } from '@/shared/utils/classNames';

interface InkPickerProps<T extends InkColor> {
  colors   : T[];
  color    : T;
  onChange : (color: T) => void;
}

// const COLORS: InkColor[] = ['black', 'blue'];

// "Original" shows a split swatch: it keeps whatever color the stroke has.
const swatch = (color: InkColor): CSSProperties =>
  color === 'original' ? { background: `linear-gradient(135deg, ${INK_COLORS.blue} 50%, ${INK_COLORS.black} 50%)` } : { background: INK_COLORS[color] };

export const InkPicker = <T extends InkColor>({ colors, color, onChange }: InkPickerProps<T>) => (
  <div role="radiogroup" aria-label={CREATE_TEXTS.color} className="flex items-center gap-2">
    {colors.map((option) => (
      <button
        key={option}
        type="button"
        role="radio"
        aria-checked={option === color}
        onClick={() => onChange(option)}
        className={cx(
          'flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors',
          option === color ? 'border-mint text-text' : 'border-line-strong text-muted hover:text-text',
        )}
      >
        <span className="size-3 rounded-full border border-white/30" style={swatch(option)} />
        {INK_LABELS[option]}
      </button>
    ))}
  </div>
);
