import { useCallback, useEffect, useState } from 'react';
import { changeSettings, getSettings } from '@/modules/settings/services/settings';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// «¿Cómo te llamo?»: the name saved in settings.json (null: none written).
export const useUserName = () => {
  const [name, setName] = useState<string | null>(null);

  const reload = useCallback(() => {
    void getSettings().then((view) => setName(view.userName)).catch(() => undefined);
  }, []);

  useEffect(reload, [reload]);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  const save = useCallback((typed: string) => {
    const next = typed.trim() || null;
    setName(next);
    void changeSettings((view) => ({ ...view, userName: next })).catch(reload);
  }, [reload]);

  return { name, save };
};
