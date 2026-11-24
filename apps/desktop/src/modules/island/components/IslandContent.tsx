import type { ReactNode, RefObject } from 'react';
import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import { getContentStyle } from '@/modules/island/utils/islandStyles';
import { cx } from '@/shared/utils/classNames';

interface IslandContentProps {
  contentRef  : RefObject<HTMLDivElement | null>;
  placement   : IslandPlacement;
  interactive : boolean;
  children    : ReactNode;
}

// Laid out at the open size, where the panel opens (toward the middle of the screen), so the panel
// reveals it while growing instead of reflowing.
export const IslandContent = ({ contentRef, placement, interactive, children }: IslandContentProps) => (
  <div ref={contentRef} className={cx('absolute', !interactive && 'pointer-events-none')} style={getContentStyle(placement)}>
    {children}
  </div>
);
