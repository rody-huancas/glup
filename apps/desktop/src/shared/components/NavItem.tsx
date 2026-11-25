import type { ComponentType } from 'react';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import type { IconProps } from '@/shared/interfaces/icon';
import { cx } from '@/shared/utils/classNames';

interface NavItemProps {
  label            : string;
  icon             : ComponentType<IconProps>;
  active           : boolean;
  // How the active item is filled (mint unless told otherwise).
  activeClassName? : string;
  onClick          : () => void;
  // Something new waits there (a dot), with its text for screen readers.
  badge?           : boolean;
  badgeLabel?      : string;
  badgeTone?       : BadgeTone;
  // A number instead of the dot (new entries), with its words for screen readers.
  count?           : string;
  countLabel?      : string;
}

export type BadgeTone = 'mint' | 'lilac';

const BADGE_CLASSES: Record<BadgeTone, string> = {
  mint  : 'bg-mint',
  lilac : 'bg-lilac',
};

const ACTIVE_CLASS = 'bg-mint font-semibold text-mint-ink';

export const NavItem = ({ label, icon: Icon, active, activeClassName = ACTIVE_CLASS, onClick, badge = false, badgeLabel, badgeTone = 'mint', count, countLabel }: NavItemProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    {...REVEAL_PROPS.nav}
    className={cx(
      'flex h-10 w-full cursor-pointer items-center gap-3 rounded-control px-3 text-[14px] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-lilac',
      active ? activeClassName : 'font-medium text-[#D6D3E3] hover:bg-raised',
    )}
  >
    <Icon />
    {label}
    {badge && <span aria-label={badgeLabel} className={cx('ml-auto size-2 shrink-0 rounded-full', BADGE_CLASSES[badgeTone])} />}
    {count && (
      <span aria-label={countLabel} className={cx('ml-auto min-w-5 shrink-0 rounded-full px-1.5 text-center text-[10px] leading-5 font-bold', active ? 'bg-black/15' : 'bg-lilac text-bg')}>
        {count}
      </span>
    )}
  </button>
);
