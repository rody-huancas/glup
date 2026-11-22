import { useEffect } from 'react';
import type { IslandState } from '@/modules/island/types/islandState';
import { getToggleDelay } from '@/modules/island/utils/collapseDelay';

interface UseIslandAutoToggleParams {
  state    : IslandState;
  inside   : boolean;
  dragging : boolean;
  blocked  : boolean;
  expand   : () => void;
  collapse : () => void;
}

export const useIslandAutoToggle = ({ state, inside, dragging, blocked, expand, collapse }: UseIslandAutoToggleParams) => {
  useEffect(() => {
    const delay = getToggleDelay({ state, inside, dragging, blocked });
    if (delay === null) return;

    const action = state === 'collapsed' ? expand : collapse;
    const timer  = window.setTimeout(action, delay);

    return () => window.clearTimeout(timer);
  }, [state, inside, dragging, blocked, expand, collapse]);
};
