import { COLLAPSE_BLOCKING_STATES, ISLAND_TIMING } from '@/modules/island/constants/island';
import type { MascotStateType } from '@/modules/mascot/types/mascotState';

interface CollapseDelayParams {
  mascot      : MascotStateType;
  dragging    : boolean;
  dropPending : boolean;
}

export const getCollapseDelay = ({ mascot, dragging, dropPending }: CollapseDelayParams): number | null => {
  if (dragging || COLLAPSE_BLOCKING_STATES.includes(mascot)) return null;
  if (dropPending) return mascot === 'idle' ? ISLAND_TIMING.afterDropDelay : null;
  return ISLAND_TIMING.leaveDelay;
};
