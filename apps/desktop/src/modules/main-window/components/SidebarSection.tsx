import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { SIDEBAR_TEXTS } from '@/modules/main-window/constants/sidebar';
import { ChevronDownIcon } from '@/shared/icons/ChevronDownIcon';
import { cx } from '@/shared/utils/classNames';

interface SidebarSectionProps {
  title    : string;
  children : ReactNode;
}

// A part of the side bar that can be folded (on a short screen the bar scrolls, but less).
export const SidebarSection = ({ title, children }: SidebarSectionProps) => {
  const [open, setOpen] = useState(true);
  const bodyId          = useId();
  const titleId         = useId();

  return (
    <section aria-labelledby={titleId} className="mt-4 flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={open ? SIDEBAR_TEXTS.collapse(title) : SIDEBAR_TEXTS.expand(title)}
        onClick={() => setOpen((value) => !value)}
        className="flex h-7 cursor-pointer items-center justify-between rounded-md px-2 text-[11px] font-bold tracking-wide text-muted uppercase outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-lilac"
      >
        <span id={titleId}>{title}</span>
        <ChevronDownIcon className={cx('size-4 transition-transform motion-reduce:transition-none', !open && '-rotate-90')} />
      </button>
      <div id={bodyId} hidden={!open} className="flex flex-col gap-0.5">
        {children}
      </div>
    </section>
  );
};
