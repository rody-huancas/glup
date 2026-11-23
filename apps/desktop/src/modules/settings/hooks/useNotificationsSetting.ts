import { useCallback, useEffect, useState } from 'react';
import type { SettingsView } from '@/modules/settings/interfaces/appSettings';
import { getSettings, updateSettings } from '@/modules/settings/services/settings';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// "Avisarme con notificaciones de Windows", kept in settings.json with the rest of the settings.
export const useNotificationsSetting = () => {
  const [view, setView] = useState<SettingsView | null>(null);

  const reload = useCallback(() => {
    void getSettings().then(setView).catch(() => undefined);
  }, []);

  useEffect(reload, [reload]);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  const change = useCallback((enabled: boolean) => {
    if (view) void updateSettings({ ...view, notificationsOff: !enabled }).then(setView).catch(() => undefined);
  }, [view]);

  return { enabled: view ? !view.notificationsOff : null, change };
};
