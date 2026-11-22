import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import { COLLAPSE_BLOCKING_STATES, ISLAND_TIMING } from '@/modules/island/constants/island';
import type { IslandFlow, IslandState } from '@/modules/island/types/islandState';
import type { MascotStateType } from '@/modules/mascot/types/mascotState';

interface CollapseDelayParams {
  state    : IslandState;
  mascot   : MascotStateType;
  dragging : boolean;
  flow     : IslandFlow;
  phase    : ActionsPhase;
}

export const getCollapseDelay = ({ state, mascot, dragging, flow, phase }: CollapseDelayParams): number | null => {
  if (dragging || flow !== 'idle' || phase === 'working') return null;
  if (COLLAPSE_BLOCKING_STATES.includes(mascot)) return null;
  if (state === 'actions') return ISLAND_TIMING.actionsLeaveDelay;
  return state === 'expanded' ? ISLAND_TIMING.leaveDelay : null;
};
