import type { ReactNode, RefObject } from 'react';
import { getIslandLayout } from '@/modules/island/utils/islandLayout';
import { getMascotSlotStyle } from '@/modules/island/utils/islandStyles';

interface IslandMascotSlotProps {
  slotRef  : RefObject<HTMLDivElement | null>;
  children : ReactNode;
}

const INITIAL_LAYOUT = getIslandLayout({ target: 'collapsed', actionsHeight: 0 });

export const IslandMascotSlot = ({ slotRef, children }: IslandMascotSlotProps) => (
  <div ref={slotRef} className="absolute left-0 top-0" style={getMascotSlotStyle(INITIAL_LAYOUT)}>
    {children}
  </div>
);
