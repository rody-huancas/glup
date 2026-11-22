import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { IslandState } from '@/modules/island/types/islandState';
import { animateIsland, applyIslandPose } from '@/modules/island/utils/islandAnimations';
import { resizeIslandWindow } from '@/modules/island/utils/islandWindow';

interface UseIslandTransitionsParams {
  elements : IslandElements;
  setState : Dispatch<SetStateAction<IslandState>>;
}

export const useIslandTransitions = ({ elements, setState }: UseIslandTransitionsParams) => {
  const busy       = useRef(false);
  const generation = useRef(0);

  const expand = useCallback(async () => {
    if (busy.current) return;

    busy.current  = true;
    const current = generation.current;

    try {
      await resizeIslandWindow('expanded');
      if (current !== generation.current) return;

      setState('expanded');
      await animateIsland({ elements, target: 'expanded' });
    } finally {
      busy.current = false;
    }
  }, [elements, setState]);

  const collapse = useCallback(async () => {
    if (busy.current) return;

    busy.current  = true;
    const current = generation.current;

    try {
      await animateIsland({ elements, target: 'collapsed' });
      if (current !== generation.current) return;

      await resizeIslandWindow('collapsed');
      if (current === generation.current) setState('collapsed');
    } finally {
      busy.current = false;
    }
  }, [elements, setState]);

  // Invalidates any running transition so it cannot override the hidden state.
  const hide = useCallback(async () => {
    generation.current += 1;
    busy.current        = false;

    applyIslandPose({ elements, target: 'collapsed' });
    setState('hidden');
    await resizeIslandWindow('collapsed');
  }, [elements, setState]);

  const reveal = useCallback(() => {
    setState((previous) => (previous === 'hidden' ? 'collapsed' : previous));
  }, [setState]);

  return { expand, collapse, hide, reveal };
};
