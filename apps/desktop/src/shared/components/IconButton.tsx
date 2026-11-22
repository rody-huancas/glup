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
}

export const IconButton = ({
  icon: Icon,
  label,
  onClick,
  active = false,
  className,
  iconClass = 'size-3.5',
}: IconButtonProps) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={active || undefined}
    title={label}
    onClick={onClick}
    className={cx(
      'flex shrink-0 cursor-pointer items-center justify-center rounded-control transition-colors hover:bg-raised',
      active ? 'text-mint' : 'text-muted hover:text-text',
      className,
    )}
  >
    <Icon className={iconClass} />
  </button>
);
