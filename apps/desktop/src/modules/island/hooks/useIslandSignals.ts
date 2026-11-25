import { useCallback, useMemo, useState } from 'react';
import { FULLSCREEN_CHANGED_EVENT, ISLAND_OPEN_EVENT, ISLAND_SHOW_EVENT, ISLAND_ZONE_EVENT, SCREEN_CAPTURE_EVENT, TRAY_VISIBILITY_EVENT } from '@/shared/constants/events';
import { useFileDrop } from '@/shared/hooks/useFileDrop';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

interface UseIslandSignalsParams {
  onFullscreenEnter : () => void;
  onFullscreenExit  : () => void;
  onOpenRequest     : () => void;
  // Files from the Explorer with a step: open like a click, not pinned.
  onShowRequest     : () => void;
  // "Mostrar/Ocultar Glup" in the tray (true when hidden).
  onTrayVisibility  : (hidden: boolean) => void;
  // "Copiar texto de la pantalla" (true while the zone is chosen).
  onCapture         : (capturing: boolean) => void;
}

// Drops are handled by the panel (home); the island only tracks whether a drag is in progress.
export const useIslandSignals = ({ onFullscreenEnter, onFullscreenExit, onOpenRequest, onShowRequest, onTrayVisibility, onCapture }: UseIslandSignalsParams) => {
  const [inside, setInside]     = useState(false);
  const [dragging, setDragging] = useState(false);

  useTauriEvent<boolean>(ISLAND_ZONE_EVENT, setInside);
  useTauriEvent<null>(ISLAND_OPEN_EVENT, onOpenRequest);
  useTauriEvent<null>(ISLAND_SHOW_EVENT, onShowRequest);
  useTauriEvent<boolean>(TRAY_VISIBILITY_EVENT, onTrayVisibility);
  useTauriEvent<boolean>(SCREEN_CAPTURE_EVENT, onCapture);

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
