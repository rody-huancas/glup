import { useCallback, useEffect, useState } from 'react';
import type { SettingsView } from '@/modules/settings/interfaces/appSettings';
import { getSettings, updateSettings } from '@/modules/settings/services/settings';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// "Guardar en el historial lo que copio de la pantalla", kept in settings.json (on by default).
export const useScreenTextHistorySetting = () => {
  const [view, setView] = useState<SettingsView | null>(null);

  const reload = useCallback(() => {
    void getSettings().then(setView).catch(() => undefined);
  }, []);

  useEffect(reload, [reload]);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  const change = useCallback((enabled: boolean) => {
    if (view) void updateSettings({ ...view, screenTextHistoryOff: !enabled }).then(setView).catch(() => undefined);
  }, [view]);

  return { enabled: view ? !view.screenTextHistoryOff : null, change };
};
