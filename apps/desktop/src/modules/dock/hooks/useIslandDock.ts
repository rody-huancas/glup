import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_DOCK, DOCK_REFRESH, FALLBACK_WORK } from '@/modules/dock/constants/dock';
import type { DragUpdate } from '@/modules/dock/interfaces/dragUpdate';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import type { IslandScreen } from '@/modules/dock/interfaces/islandScreen';
import { beginIslandDrag, getIslandScreens, setIslandDock, setIslandFrame } from '@/modules/dock/services/dock';
import { dockRegion } from '@/modules/dock/utils/dockLayout';
import { placeIsland } from '@/modules/dock/utils/placement';
import { resolveDock, sameDock, snapDock, workSize } from '@/modules/dock/utils/snapDock';
import { getSettings } from '@/modules/settings/services/settings';
import { ISLAND_DRAG_EVENT, SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

interface UseIslandDockParams {
  // The drag began and ended: the machine keeps the island from opening meanwhile.
  onMoving: (moving: boolean) => void;
}

// Where the island lives now: the saved dock on the screens there are (a screen that is gone gives way
// to the main one), and while it is dragged, the edge it would land on. The window follows the placement.
export const useIslandDock = ({ onMoving }: UseIslandDockParams) => {
  const [screens, setScreens] = useState<IslandScreen[]>([]);
  const [saved, setSaved]     = useState<IslandDock | null>(null);
  const [preview, setPreview] = useState<IslandDock | null>(null);
  const previewRef            = useRef<IslandDock | null>(null);
  const screensRef            = useRef<IslandScreen[]>([]);

  const loadScreens = useCallback(() => {
    void getIslandScreens()
      .then((next) => {
        // A new array only when something changed, so the window is not placed again for nothing.
        if (JSON.stringify(next) === JSON.stringify(screensRef.current)) return;
        screensRef.current = next;
        setScreens(next);
      })
      .catch(() => undefined);
  }, []);

  const loadDock = useCallback(() => {
    void getSettings().then((view) => setSaved(view.islandDock)).catch(() => undefined);
  }, []);

  useEffect(() => {
    loadScreens();
    loadDock();

    // A monitor unplugged or a new resolution: the island goes to the equivalent spot.
    const timer = window.setInterval(loadScreens, DOCK_REFRESH);
    return () => window.clearInterval(timer);
  }, [loadScreens, loadDock]);

  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, loadDock);

  const resolved  = useMemo(() => resolveDock(preview ?? saved, screens), [preview, saved, screens]);
  const placement = useMemo(
    () => placeIsland(resolved ? { dock: resolved.dock, work: workSize(resolved.screen) } : { dock: DEFAULT_DOCK, work: FALLBACK_WORK }),
    [resolved],
  );

  // Until the screens are known the window stays where it started.
  useEffect(() => {
    if (!resolved) return;
    void setIslandFrame({ screen: resolved.screen.id, rect: placement.frame, pill: dockRegion(placement, 'collapsed') }).catch(() => undefined);
  }, [resolved, placement]);

  const onDrag = useCallback(({ x, y, done }: DragUpdate) => {
    const next = snapDock({ point: { x, y }, screens: screensRef.current }) ?? previewRef.current;

    if (!done) {
      // The same spot again (the cursor moved along the same place): nothing to move.
      if (next && previewRef.current && sameDock(next, previewRef.current)) return;
      previewRef.current = next;
      setPreview(next);
      return;
    }

    // Dropped: the dock it landed on stays (saved before the preview goes, so it never jumps back).
    previewRef.current = null;
    if (next) {
      setSaved(next);
      void setIslandDock(next).catch(() => undefined);
    }
    setPreview(null);
    onMoving(false);
  }, [onMoving]);

  useTauriEvent<DragUpdate>(ISLAND_DRAG_EVENT, onDrag);

  const beginDrag = useCallback(() => {
    onMoving(true);
    loadScreens();
    void beginIslandDrag().catch(() => onMoving(false));
  }, [onMoving, loadScreens]);

  return { placement, dragging: preview !== null, beginDrag };
};
