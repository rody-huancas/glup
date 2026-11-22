import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FULLSCREEN_CHANGED_EVENT, ISLAND_ZONE_EVENT } from '@/shared/constants/events';
import { useFileDrop } from '@/shared/hooks/useFileDrop';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

interface UseIslandSignalsParams {
  onFullscreenEnter : () => void;
  onFullscreenExit  : () => void;
  onDrop            : (paths: string[]) => void;
}

export const useIslandSignals = ({ onFullscreenEnter, onFullscreenExit, onDrop }: UseIslandSignalsParams) => {
  const [inside, setInside]     = useState(false);
  const [dragging, setDragging] = useState(false);
  const dropRef                 = useRef(onDrop);

  useEffect(() => {
    dropRef.current = onDrop;
  }, [onDrop]);

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
      onDrop  : (paths: string[]) => {
        setDragging(false);
        dropRef.current(paths);
      },
    }),
    [],
  );

  useFileDrop(dropHandlers);

  return { inside, dragging };
};
