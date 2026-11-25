import type { ComponentType } from 'react';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import type { IconProps } from '@/shared/interfaces/icon';
import { cx } from '@/shared/utils/classNames';

interface NavItemProps {
  label           : string;
  icon            : ComponentType<IconProps>;
  active          : boolean;
  // How the active item is filled (mint unless told otherwise).
  activeClassName?: string;
  onClick         : () => void;
  // Something new waits there (a dot), with its text for screen readers.
  badge?          : boolean;
  badgeLabel?     : string;
  badgeTone?      : BadgeTone;
}

export type BadgeTone = 'mint' | 'lilac';

const BADGE_CLASSES: Record<BadgeTone, string> = {
  mint  : 'bg-mint',
  lilac : 'bg-lilac',
};

const ACTIVE_CLASS = 'bg-mint font-semibold text-mint-ink';

export const NavItem = ({ label, icon: Icon, active, activeClassName = ACTIVE_CLASS, onClick, badge = false, badgeLabel, badgeTone = 'mint' }: NavItemProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    {...REVEAL_PROPS.nav}
    className={cx(
      'flex h-11 w-full cursor-pointer items-center gap-3 rounded-control px-3 text-[15px] transition-colors',
      active ? activeClassName : 'font-medium text-[#D6D3E3] hover:bg-raised',
    )}
  >
    <Icon />
    {label}
    {badge && <span aria-label={badgeLabel} className={cx('ml-auto size-2 shrink-0 rounded-full', BADGE_CLASSES[badgeTone])} />}
  </button>
);
