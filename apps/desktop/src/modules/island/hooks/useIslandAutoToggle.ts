import { useEffect } from 'react';
import { ISLAND_TIMING } from '@/modules/island/constants/island';
import type { IslandState } from '@/modules/island/types/islandState';
import { getCollapseDelay } from '@/modules/island/utils/collapseDelay';
import type { MascotStateType } from '@/modules/mascot/types/mascotState';

interface UseIslandAutoToggleParams {
  state       : IslandState;
  inside      : boolean;
  dragging    : boolean;
  dropPending : boolean;
  mascot      : MascotStateType;
  expand      : () => void;
  collapse    : () => void;
}

export const useIslandAutoToggle = ({
  state,
  inside,
  dragging,
  dropPending,
  mascot,
  expand,
  collapse,
}: UseIslandAutoToggleParams) => {
  useEffect(() => {
    const delay = (() => {
      if (state === 'collapsed' && inside) return ISLAND_TIMING.dwell;
      if (state === 'expanded' && !inside) return getCollapseDelay({ mascot, dragging, dropPending });
      return null;
    })();

    if (delay === null) return;

    const action = state === 'collapsed' ? expand : collapse;
    const timer  = window.setTimeout(action, delay);

    return () => window.clearTimeout(timer);
  }, [state, inside, dragging, dropPending, mascot, expand, collapse]);
};
