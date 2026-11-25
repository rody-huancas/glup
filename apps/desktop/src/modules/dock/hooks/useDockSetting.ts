import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_BUBBLE, DEFAULT_DOCK } from '@/modules/dock/constants/dock';
import type { BubbleSpot } from '@/modules/dock/interfaces/bubbleSpot';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import type { IslandScreen } from '@/modules/dock/interfaces/islandScreen';
import { getIslandScreens, setIslandBubble, setIslandDock } from '@/modules/dock/services/dock';
import type { IslandRest } from '@/modules/dock/types/islandRest';
import { resolveBubble } from '@/modules/dock/utils/bubble';
import { resolveDock } from '@/modules/dock/utils/snapDock';
import { logPosition } from '@/modules/island/utils/islandLog';
import { getSettings } from '@/modules/settings/services/settings';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// Ajustes › Posición de Glup: the dock (or, as a bubble, its spot) as it is now, on the screens there
// are, and how to change it.
export const useDockSetting = () => {
  const [screens, setScreens] = useState<IslandScreen[] | null>(null);
  const [saved, setSaved]     = useState<IslandDock | null>(null);
  const [spot, setSpot]       = useState<BubbleSpot | null>(null);
  const [rest, setRest]       = useState<IslandRest>('pill');
  const [failed, setFailed]   = useState(false);

  const reload = useCallback(() => {
    void getSettings()
      .then((view) => {
        setSaved(view.islandDock);
        setSpot(view.islandBubble);
        setRest(view.islandRest);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    reload();
    void getIslandScreens().then(setScreens).catch(() => setFailed(true));
  }, [reload]);

  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  const resolved = useMemo(() => (screens ? resolveDock(saved, screens) : null), [saved, screens]);
  const bubble   = useMemo(() => (screens ? resolveBubble(spot, screens) : null), [spot, screens]);
  const main     = screens?.find((screen) => screen.primary) ?? screens?.[0];

  const choose = useCallback((dock: IslandDock) => {
    logPosition(`guardo en settings: ${dock.edge} ${Math.round(dock.offset * 100)} %`);
    setFailed(false);
    setSaved(dock);
    void setIslandDock(dock).catch(() => setFailed(true));
  }, []);

  const chooseSpot = useCallback((next: BubbleSpot) => {
    setFailed(false);
    setSpot(next);
    void setIslandBubble(next).catch(() => setFailed(true));
  }, []);

  // On top in the middle of the main screen, as it came; the bubble, to the middle of the main screen.
  const reset = useCallback(() => {
    if (rest === 'bubble') chooseSpot({ ...DEFAULT_BUBBLE, screen: main?.id ?? null });
    else choose({ ...DEFAULT_DOCK, screen: main?.id ?? null });
  }, [rest, main, choose, chooseSpot]);

  return { screens: screens ?? [], rest, resolved, bubble, failed, choose, chooseSpot, reset };
};
