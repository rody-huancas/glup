import type { ReactNode, RefObject } from 'react';
import { getIslandLayout } from '@/modules/island/utils/islandLayout';
import { getContentStyle } from '@/modules/island/utils/islandStyles';
import { cx } from '@/shared/utils/classNames';

interface IslandContentProps {
  contentRef  : RefObject<HTMLDivElement | null>;
  interactive : boolean;
  children    : ReactNode;
}

const INITIAL_LAYOUT = getIslandLayout('collapsed');

// Laid out at the expanded size so the panel reveals it while growing instead of reflowing.
export const IslandContent = ({ contentRef, interactive, children }: IslandContentProps) => (
  <div
    ref={contentRef}
    className={cx('absolute left-1/2 top-0 -translate-x-1/2', !interactive && 'pointer-events-none')}
    style={getContentStyle(INITIAL_LAYOUT)}
  >
    {children}
  </div>
);
