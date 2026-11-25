import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_DOCK, DOCK_REFRESH, FALLBACK_WORK } from '@/modules/dock/constants/dock';
import type { BubbleSpot } from '@/modules/dock/interfaces/bubbleSpot';
import type { DragUpdate } from '@/modules/dock/interfaces/dragUpdate';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import type { IslandScreen } from '@/modules/dock/interfaces/islandScreen';
import type { IslandRest } from '@/modules/dock/types/islandRest';
import { beginIslandDrag, getIslandScreens, setIslandBubble, setIslandDock, setIslandFrame } from '@/modules/dock/services/dock';
import { bubbleOnDesktop, dragBubble, placeBubble, resolveBubble, sameSpot } from '@/modules/dock/utils/bubble';
import { dockRegion, regionShape } from '@/modules/dock/utils/dockLayout';
import { placeIsland } from '@/modules/dock/utils/placement';
import { revealDelay } from '@/modules/dock/utils/reveal';
import { resolveDock, sameDock, snapDock, workSize } from '@/modules/dock/utils/snapDock';
import { logPosition } from '@/modules/island/utils/islandLog';
import { getSettings } from '@/modules/settings/services/settings';
import { ISLAND_DRAG_EVENT, SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';
import type { Point } from '@/shared/interfaces/point';

interface UseIslandDockParams {
  // The drag began and ended: the machine keeps the island from opening meanwhile.
  onMoving: (moving: boolean) => void;
}

// Where the island lives now: the saved dock (or the bubble's spot) on the screens there are (a screen
// that is gone gives way to the main one), and while it is dragged, where it would land. The window
// follows the placement.
export const useIslandDock = ({ onMoving }: UseIslandDockParams) => {
  const [screens, setScreens]         = useState<IslandScreen[]>([]);
  const [saved, setSaved]             = useState<IslandDock | null>(null);
  const [preview, setPreview]         = useState<IslandDock | null>(null);
  const [savedSpot, setSavedSpot]     = useState<BubbleSpot | null>(null);
  const [spotPreview, setSpotPreview] = useState<BubbleSpot | null>(null);
  const [rest, setRest]               = useState<IslandRest>('pill');
  const [delay, setDelay]             = useState<number | null>(null);
  const previewRef                    = useRef<IslandDock | null>(null);
  const spotRef                       = useRef<BubbleSpot | null>(null);
  // How far the bubble's middle is from the cursor that grabbed it (physical pixels).
  const grabRef                       = useRef<Point | null>(null);
  const screensRef                    = useRef<IslandScreen[]>([]);
  const restRef                       = useRef<IslandRest>('pill');

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
    void getSettings()
      .then((view) => {
        logPosition(`settings cambiaron: ${view.islandDock ? `${view.islandDock.edge} ${Math.round(view.islandDock.offset * 100)} %` : 'sin dock'}`);
        setSaved(view.islandDock);
        setSavedSpot(view.islandBubble);
        setRest(view.islandRest);
        setDelay(view.revealDelay);
        restRef.current = view.islandRest;
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadScreens();
    loadDock();

    // A monitor unplugged or a new resolution: the island goes to the equivalent spot.
    const timer = window.setInterval(loadScreens, DOCK_REFRESH);
    return () => window.clearInterval(timer);
  }, [loadScreens, loadDock]);

  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, loadDock);

  const resolved = useMemo(() => resolveDock(preview ?? saved, screens), [preview, saved, screens]);
  const bubble   = useMemo(() => (rest === 'bubble' ? resolveBubble(spotPreview ?? savedSpot, screens) : null), [rest, spotPreview, savedSpot, screens]);

  // Until the screens are known it is laid out as the startup window (on top in the middle).
  const placement = useMemo(() => {
    if (bubble) return placeBubble({ spot: bubble.spot, work: workSize(bubble.screen) });
    if (resolved) return placeIsland({ dock: resolved.dock, work: workSize(resolved.screen), rest });
    return placeIsland({ dock: DEFAULT_DOCK, work: FALLBACK_WORK, rest });
  }, [bubble, resolved, rest]);

  const screen = bubble?.screen ?? resolved?.screen ?? null;

  useEffect(() => {
    if (!screen) return;
    const pill  = dockRegion(placement, 'collapsed');
    const shape = regionShape(placement, 'collapsed');
    logPosition(`ventana: pido ${placement.frame.width}x${placement.frame.height} en ${placement.frame.x},${placement.frame.y}`);
    void setIslandFrame({ screen: screen.id, rect: placement.frame, pill, pillClickable: shape.clickable, pillRound: shape.round }).catch(() => undefined);
  }, [screen, placement]);

  const placementRef = useRef(placement);
  const screenRef    = useRef(screen);

  useEffect(() => {
    placementRef.current = placement;
    screenRef.current    = screen;
  }, [placement, screen]);

  // The pill snaps to the edge or corner it would land on.
  const dragPill = useCallback(({ x, y, done }: DragUpdate) => {
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
  }, []);

  // The bubble follows the cursor from where it was grabbed and stays where it is dropped, inside the
  // screen under it.
  const dragFloating = useCallback(({ x, y, done }: DragUpdate) => {
    if (!grabRef.current && screenRef.current) {
      const middle    = bubbleOnDesktop(placementRef.current, screenRef.current);
      grabRef.current = middle ? { x: middle.x - x, y: middle.y - y } : { x: 0, y: 0 };
    }

    const next = dragBubble({ cursor: { x, y }, grab: grabRef.current ?? { x: 0, y: 0 }, screens: screensRef.current }) ?? spotRef.current;

    if (!done) {
      if (next && spotRef.current && sameSpot(next, spotRef.current)) return;
      spotRef.current = next;
      setSpotPreview(next);
      return;
    }

    spotRef.current = null;
    grabRef.current = null;
    if (next) {
      setSavedSpot(next);
      void setIslandBubble(next).catch(() => undefined);
    }
    setSpotPreview(null);
  }, []);

  const onDrag = useCallback((update: DragUpdate) => {
    if (restRef.current === 'bubble') dragFloating(update);
    else dragPill(update);

    if (update.done) onMoving(false);
  }, [dragFloating, dragPill, onMoving]);

  useTauriEvent<DragUpdate>(ISLAND_DRAG_EVENT, onDrag);

  const beginDrag = useCallback(() => {
    grabRef.current = null;
    onMoving(true);
    loadScreens();
    void beginIslandDrag().catch(() => onMoving(false));
  }, [onMoving, loadScreens]);

  return { placement, dragging: preview !== null || spotPreview !== null, beginDrag, reveal: revealDelay(delay) };
};
