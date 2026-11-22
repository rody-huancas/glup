import { useCallback, useMemo, useState } from 'react';
import { FULLSCREEN_CHANGED_EVENT, ISLAND_ZONE_EVENT } from '@/shared/constants/events';
import { useFileDrop } from '@/shared/hooks/useFileDrop';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

interface UseIslandSignalsParams {
  onFullscreenEnter : () => void;
  onFullscreenExit  : () => void;
}

export const useIslandSignals = ({ onFullscreenEnter, onFullscreenExit }: UseIslandSignalsParams) => {
  const [inside, setInside]           = useState(false);
  const [dragging, setDragging]       = useState(false);
  const [dropPending, setDropPending] = useState(false);

  useTauriEvent<boolean>(ISLAND_ZONE_EVENT, setInside);

  const onFullscreenChange = useCallback(
    (fullscreen: boolean) => (fullscreen ? onFullscreenEnter() : onFullscreenExit()),
    [onFullscreenEnter, onFullscreenExit],
  );

  useTauriEvent<boolean>(FULLSCREEN_CHANGED_EVENT, onFullscreenChange);

  const dropHandlers = useMemo(
    () => ({
      onEnter : () => setDragging(true),
      onLeave : () => setDragging(false),
      onDrop  : () => {
        setDragging(false);
        setDropPending(true);
      },
    }),
    [],
  );

  useFileDrop(dropHandlers);

  const clearDropPending = useCallback(() => setDropPending(false), []);

  return { inside, dragging, dropPending, clearDropPending };
};
