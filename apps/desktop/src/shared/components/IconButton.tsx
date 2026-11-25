import type { ComponentType } from 'react';
import type { IconProps } from '@/shared/interfaces/icon';
import { cx } from '@/shared/utils/classNames';

interface IconButtonProps {
  icon       : ComponentType<IconProps>;
  label      : string;
  onClick    : () => void;
  active?    : boolean;
  className? : string;
  iconClass? : string;
  disabled?  : boolean;
}

export const IconButton = ({
  icon: Icon,
  label,
  onClick,
  active = false,
  className,
  iconClass = 'size-3.5',
  disabled  = false,
}: IconButtonProps) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={active || undefined}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={cx(
      'flex shrink-0 cursor-pointer items-center justify-center rounded-control transition-colors outline-none hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lilac disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent',
      active ? 'text-mint' : 'text-muted hover:text-text',
      className,
    )}
  >
    <Icon className={iconClass} />
  </button>
);
