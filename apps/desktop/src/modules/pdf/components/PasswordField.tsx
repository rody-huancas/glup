import { useState } from 'react';
import { PROTECT_TEXTS } from '@/modules/pdf/constants/protect';
import { EyeIcon } from '@/shared/icons/EyeIcon';
import { EyeOffIcon } from '@/shared/icons/EyeOffIcon';
import { cx } from '@/shared/utils/classNames';

interface PasswordFieldProps {
  label      : string;
  value      : string;
  onChange   : (value: string) => void;
  invalid?   : boolean;
  autoFocus? : boolean;
  onEnter?   : () => void;
}

// The eye shows what was typed; nothing is remembered by the browser or the system.
export const PasswordField = ({ label, value, onChange, invalid = false, autoFocus = false, onEnter }: PasswordFieldProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
      {label}
      <span
        className={cx(
          'flex h-10 items-center rounded-control border bg-raised pl-3 focus-within:border-lilac',
          invalid ? 'border-[#E58A9A]' : 'border-line-strong',
        )}
      >
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onEnter?.()}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-normal text-text outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? PROTECT_TEXTS.hide : PROTECT_TEXTS.show}
          aria-pressed={visible}
          className="flex h-full w-10 shrink-0 cursor-pointer items-center justify-center text-muted hover:text-text"
        >
          {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </button>
      </span>
    </label>
  );
};
