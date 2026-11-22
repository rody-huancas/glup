import type { ReactNode, RefObject } from 'react';
import { getIslandLayout } from '@/modules/island/utils/islandLayout';
import { getMascotSlotStyle, getPeekStyle } from '@/modules/island/utils/islandStyles';
import { cx } from '@/shared/utils/classNames';

interface IslandMascotSlotProps {
  peekRef     : RefObject<HTMLDivElement | null>;
  interactive : boolean;
  children    : ReactNode;
}

const INITIAL_LAYOUT = getIslandLayout('collapsed');

// The pill: only the top of Glup peeks out, cropped by the 120x24 box.
export const IslandMascotSlot = ({ peekRef, interactive, children }: IslandMascotSlotProps) => (
  <div
    ref={peekRef}
    className={cx('absolute left-1/2 top-0 h-6 w-[120px] -translate-x-1/2 overflow-hidden', !interactive && 'pointer-events-none')}
    style={getPeekStyle(INITIAL_LAYOUT)}
  >
    <div className="absolute left-0 top-0" style={getMascotSlotStyle()}>
      {children}
    </div>
  </div>
);
