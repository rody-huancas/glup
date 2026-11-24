import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_DOCK } from '@/modules/dock/constants/dock';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import type { IslandScreen } from '@/modules/dock/interfaces/islandScreen';
import { getIslandScreens, setIslandDock } from '@/modules/dock/services/dock';
import { resolveDock } from '@/modules/dock/utils/snapDock';
import { getSettings } from '@/modules/settings/services/settings';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// Ajustes › Posición de Glup: the dock as it is now (on the screens there are) and how to change it.
export const useDockSetting = () => {
  const [screens, setScreens] = useState<IslandScreen[] | null>(null);
  const [saved, setSaved]     = useState<IslandDock | null>(null);
  const [failed, setFailed]   = useState(false);

  const reload = useCallback(() => {
    void getSettings().then((view) => setSaved(view.islandDock)).catch(() => undefined);
  }, []);

  useEffect(() => {
    reload();
    void getIslandScreens().then(setScreens).catch(() => setFailed(true));
  }, [reload]);

  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  const resolved = useMemo(() => (screens ? resolveDock(saved, screens) : null), [saved, screens]);

  const choose = useCallback((dock: IslandDock) => {
    setFailed(false);
    setSaved(dock);
    void setIslandDock(dock).catch(() => setFailed(true));
  }, []);

  // On top in the middle of the main screen, as it came.
  const reset = useCallback(() => {
    const main = screens?.find((screen) => screen.primary) ?? screens?.[0];
    choose({ ...DEFAULT_DOCK, screen: main?.id ?? null });
  }, [screens, choose]);

  return { screens: screens ?? [], resolved, failed, choose, reset };
};
