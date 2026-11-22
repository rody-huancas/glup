import type { ComponentType } from 'react';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import type { IconProps } from '@/shared/interfaces/icon';
import { cx } from '@/shared/utils/classNames';

interface NavItemProps {
  label   : string;
  icon    : ComponentType<IconProps>;
  active  : boolean;
  onClick : () => void;
}

export const NavItem = ({ label, icon: Icon, active, onClick }: NavItemProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    {...REVEAL_PROPS.nav}
    className={cx(
      'flex h-11 w-full cursor-pointer items-center gap-3 rounded-control px-3 text-[15px] transition-colors',
      active ? 'bg-[#24302E] font-semibold text-mint' : 'font-medium text-[#D6D3E3] hover:bg-raised',
    )}
  >
    <Icon />
    {label}
  </button>
);
