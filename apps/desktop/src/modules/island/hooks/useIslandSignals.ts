import { useCallback, useMemo, useState } from 'react';
import { FULLSCREEN_CHANGED_EVENT, ISLAND_OPEN_EVENT, ISLAND_ZONE_EVENT } from '@/shared/constants/events';
import { useFileDrop } from '@/shared/hooks/useFileDrop';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

interface UseIslandSignalsParams {
  onFullscreenEnter : () => void;
  onFullscreenExit  : () => void;
  onOpenRequest     : () => void;
}

// Drops are handled by the panel (home); the island only tracks whether a drag is in progress.
export const useIslandSignals = ({ onFullscreenEnter, onFullscreenExit, onOpenRequest }: UseIslandSignalsParams) => {
  const [inside, setInside]     = useState(false);
  const [dragging, setDragging] = useState(false);

  useTauriEvent<boolean>(ISLAND_ZONE_EVENT, setInside);
  useTauriEvent<null>(ISLAND_OPEN_EVENT, onOpenRequest);

  const onFullscreenChange = useCallback(
    (fullscreen: boolean) => (fullscreen ? onFullscreenEnter() : onFullscreenExit()),
    [onFullscreenEnter, onFullscreenExit],
  );

  useTauriEvent<boolean>(FULLSCREEN_CHANGED_EVENT, onFullscreenChange);

  const dragHandlers = useMemo(
    () => ({
      onEnter : () => setDragging(true),
      onLeave : () => setDragging(false),
      onDrop  : () => setDragging(false),
    }),
    [],
  );

  useFileDrop(dragHandlers);

  return { inside, dragging };
};
