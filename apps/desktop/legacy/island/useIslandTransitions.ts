import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ISLAND_SIZES } from '@/modules/island/constants/island';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';
import type { IslandLayout, WindowSize } from '@/modules/island/interfaces/islandLayout';
import type { IslandState } from '@/modules/island/types/islandState';
import { animateIsland, applyIslandPose } from '@/modules/island/utils/islandAnimations';
import { getBoundingSize, getIslandLayout } from '@/modules/island/utils/islandLayout';
import { setIslandArea } from '@/modules/island/utils/islandWindow';

interface UseIslandTransitionsParams {
  elements : IslandElements;
  setState : Dispatch<SetStateAction<IslandState>>;
}

export const useIslandTransitions = ({ elements, setState }: UseIslandTransitionsParams) => {
  const generation = useRef(0);
  const queue      = useRef<Promise<void>>(Promise.resolve());
  const areaSize   = useRef<WindowSize>(ISLAND_SIZES.collapsed);

  // The window never moves or resizes, so the pill stays still and WebView2 never repaints a stale frame.
  const setArea = useCallback(async (size: WindowSize) => {
    await setIslandArea(size);
    areaSize.current = size;
  }, []);

  // Grows the visible area before animating and shrinks it afterwards, so the panel is never clipped.
  const transitionTo = useCallback((layout: IslandLayout): Promise<void> => {
    const ticket    = generation.current;
    const isCurrent = () => ticket === generation.current;

    const run = async () => {
      if (!isCurrent()) return;

      await setArea(getBoundingSize(areaSize.current, layout.size));
      if (!isCurrent()) return;

      if (layout.target !== 'collapsed') setState(layout.target);
      await animateIsland({ elements, layout });
      if (!isCurrent()) return;

      await setArea(layout.size);
      if (isCurrent() && layout.target === 'collapsed') setState('collapsed');
    };

    queue.current = queue.current.then(run).catch(() => undefined);
    return queue.current;
  }, [elements, setArea, setState]);

  // Invalidates queued and running transitions so they cannot override the hidden state.
  const hide = useCallback(async () => {
    generation.current += 1;

    applyIslandPose({ elements, layout: getIslandLayout('collapsed') });
    setState('hidden');
    await setArea(ISLAND_SIZES.collapsed);
  }, [elements, setArea, setState]);

  const reveal = useCallback(() => {
    setState((previous) => (previous === 'hidden' ? 'collapsed' : previous));
  }, [setState]);

  return { transitionTo, hide, reveal };
};
