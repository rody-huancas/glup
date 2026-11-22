import type { ReactNode, RefObject } from 'react';
import { getIslandLayout } from '@/modules/island/utils/islandLayout';
import { getActionsSlotStyle } from '@/modules/island/utils/islandStyles';

interface IslandActionsSlotProps {
  slotRef     : RefObject<HTMLDivElement | null>;
  interactive : boolean;
  children    : ReactNode;
}

const INITIAL_LAYOUT = getIslandLayout({ target: 'collapsed', actionsHeight: 0 });

export const IslandActionsSlot = ({ slotRef, interactive, children }: IslandActionsSlotProps) => (
  <div
    ref={slotRef}
    className={`absolute ${interactive ? '' : 'pointer-events-none'}`}
    style={getActionsSlotStyle(INITIAL_LAYOUT)}
  >
    {children}
  </div>
);
