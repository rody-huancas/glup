import { useEffect } from 'react';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import { ISLAND_TIMING } from '@/modules/island/constants/island';
import type { IslandFlow, IslandState } from '@/modules/island/types/islandState';
import { getCollapseDelay } from '@/modules/island/utils/collapseDelay';
import type { MascotStateType } from '@/modules/mascot/types/mascotState';

interface UseIslandAutoToggleParams {
  state    : IslandState;
  inside   : boolean;
  dragging : boolean;
  flow     : IslandFlow;
  phase    : ActionsPhase;
  mascot   : MascotStateType;
  expand   : () => void;
  collapse : () => void;
}

export const useIslandAutoToggle = ({
  state,
  inside,
  dragging,
  flow,
  phase,
  mascot,
  expand,
  collapse,
}: UseIslandAutoToggleParams) => {
  useEffect(() => {
    const delay = (() => {
      if (state === 'collapsed') return inside ? ISLAND_TIMING.dwell : null;
      if (inside) return null;
      return getCollapseDelay({ state, mascot, dragging, flow, phase });
    })();

    if (delay === null) return;

    const action = state === 'collapsed' ? expand : collapse;
    const timer  = window.setTimeout(action, delay);

    return () => window.clearTimeout(timer);
  }, [state, inside, dragging, flow, phase, mascot, expand, collapse]);
};
