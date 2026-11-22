import type { ReactNode, RefObject } from 'react';
import { getMascotSlotStyle } from '@/modules/island/utils/islandStyles';

interface IslandMascotSlotProps {
  slotRef  : RefObject<HTMLDivElement | null>;
  children : ReactNode;
}

export const IslandMascotSlot = ({ slotRef, children }: IslandMascotSlotProps) => (
  <div ref={slotRef} className="absolute left-0 top-0" style={getMascotSlotStyle('collapsed')}>
    {children}
  </div>
);
