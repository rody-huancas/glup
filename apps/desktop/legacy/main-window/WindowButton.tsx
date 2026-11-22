import type { ComponentType } from 'react';
import type { IconProps } from '@/shared/interfaces/icon';

interface WindowButtonProps {
  icon    : ComponentType<IconProps>;
  label   : string;
  onClick : () => void;
}

export const WindowButton = ({ icon: Icon, label, onClick }: WindowButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className="flex h-7 w-9 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-text"
  >
    <Icon className="size-3.5" />
  </button>
);
