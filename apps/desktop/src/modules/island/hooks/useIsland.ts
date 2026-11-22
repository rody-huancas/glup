import { useCallback, useMemo, useState } from 'react';
import { useIslandAutoToggle } from '@/modules/island/hooks/useIslandAutoToggle';
import { useIslandSignals } from '@/modules/island/hooks/useIslandSignals';
import { useIslandTransitions } from '@/modules/island/hooks/useIslandTransitions';
import type { IslandState } from '@/modules/island/types/islandState';
import { createIslandElements } from '@/modules/island/utils/elements';
import type { MascotState, MascotStateType } from '@/modules/mascot/types/mascotState';

export const useIsland = () => {
  const [state, setState]   = useState<IslandState>('collapsed');
  const [mascot, setMascot] = useState<MascotStateType>('idle');
  const elements            = useMemo(createIslandElements, []);

  const { expand, collapse, hide, reveal } = useIslandTransitions({ elements, setState });

  const { inside, dragging, dropPending, clearDropPending } = useIslandSignals({
    onFullscreenEnter : hide,
    onFullscreenExit  : reveal,
  });

  const collapseAndReset = useCallback(() => {
    clearDropPending();
    void collapse();
  }, [clearDropPending, collapse]);

  const onMascotStateChange = useCallback((next: MascotState) => setMascot(next.type), []);

  useIslandAutoToggle({
    state,
    inside,
    dragging,
    dropPending,
    mascot,
    expand,
    collapse: collapseAndReset,
  });

  return { elements, onMascotStateChange };
};
