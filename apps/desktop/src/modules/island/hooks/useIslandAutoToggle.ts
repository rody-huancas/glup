import { useEffect } from 'react';
import type { IslandState } from '@/modules/island/types/islandState';
import { getToggleDelay } from '@/modules/island/utils/collapseDelay';

interface UseIslandAutoToggleParams {
  state    : IslandState;
  inside   : boolean;
  dragging : boolean;
  blocked  : boolean;
  // Hidden at rest: how long the cursor rests against the edge before Glup comes out (ms).
  reveal   : number | null;
  expand   : () => void;
  collapse : () => void;
}

export const useIslandAutoToggle = ({ state, inside, dragging, blocked, reveal, expand, collapse }: UseIslandAutoToggleParams) => {
  useEffect(() => {
    const delay = getToggleDelay({ state, inside, dragging, blocked, reveal });
    if (delay === null) return;

    const action = state === 'collapsed' ? expand : collapse;
    const timer  = window.setTimeout(action, delay);

    return () => window.clearTimeout(timer);
  }, [state, inside, dragging, blocked, reveal, expand, collapse]);
};
