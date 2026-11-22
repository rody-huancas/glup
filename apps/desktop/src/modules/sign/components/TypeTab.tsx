import { SIGNATURE_FONTS } from '@/modules/sign/constants/fonts';
import { CREATE_TEXTS } from '@/modules/sign/constants/sign';
import { cx } from '@/shared/utils/classNames';

interface TypeTabProps {
  name     : string;
  font     : string;
  ink      : string;
  onName   : (name: string) => void;
  onFont   : (font: string) => void;
}

// The name in four handwriting fonts; a tap picks one.
export const TypeTab = ({ name, font, ink, onName, onFont }: TypeTabProps) => (
  <div className="flex flex-col gap-2">
    <input
      autoFocus
      value={name}
      onChange={(event) => onName(event.target.value)}
      placeholder={CREATE_TEXTS.namePlaceholder}
      aria-label={CREATE_TEXTS.nameField}
      className="h-10 rounded-control border border-line-strong bg-raised px-3 text-[13px] text-text outline-none placeholder:text-muted focus:border-lilac"
    />
    <p className="text-[11px] text-muted">{CREATE_TEXTS.pick}</p>
    <div role="radiogroup" className="grid grid-cols-2 gap-2">
      {SIGNATURE_FONTS.map((family) => (
        <button
          key={family}
          type="button"
          role="radio"
          aria-checked={family === font}
          aria-label={family}
          onClick={() => onFont(family)}
          className={cx(
            'flex h-[60px] cursor-pointer items-center justify-center overflow-hidden rounded-control border-2 bg-[#FAFAF7] px-3 transition-colors',
            family === font ? 'border-mint' : 'border-transparent hover:border-line-strong',
          )}
        >
          <span className="truncate text-[28px] leading-none" style={{ fontFamily: `"${family}"`, color: ink }}>
            {name.trim() || CREATE_TEXTS.nameField}
          </span>
        </button>
      ))}
    </div>
  </div>
);
