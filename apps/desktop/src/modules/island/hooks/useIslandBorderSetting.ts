import { useCallback, useEffect, useState } from 'react';
import type { IslandBorder } from '@/modules/island/types/islandBorder';
import { changeSettings, getSettings } from '@/modules/settings/services/settings';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

export const useIslandBorderSetting = () => {
  const [border, setBorder] = useState<IslandBorder | null>(null);

  const reload = useCallback(() => {
    void getSettings().then((view) => setBorder(view.islandBorder)).catch(() => undefined);
  }, []);

  useEffect(reload, [reload]);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  const choose = useCallback((next: IslandBorder) => {
    setBorder(next);
    void changeSettings((view) => ({ ...view, islandBorder: next })).catch(reload);
  }, [reload]);

  return { border, choose };
};
