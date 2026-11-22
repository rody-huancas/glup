import { useCallback, useEffect, useState } from 'react';
import { getAutostart, setAutostart } from '@/modules/settings/services/startup';
import { AUTOSTART_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// The real "open with the computer" state, kept in sync with the tray checkbox.
export const useAutostart = () => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving]   = useState(false);
  const [failed, setFailed]   = useState(false);

  useEffect(() => {
    void getAutostart().then(setEnabled).catch(() => setFailed(true));
  }, []);

  useTauriEvent<boolean>(AUTOSTART_CHANGED_EVENT, setEnabled);

  const change = useCallback((next: boolean) => {
    setSaving(true);
    setFailed(false);

    void setAutostart(next)
      .then(setEnabled)
      .catch(() => setFailed(true))
      .finally(() => setSaving(false));
  }, []);

  return { enabled, saving, failed, change };
};
