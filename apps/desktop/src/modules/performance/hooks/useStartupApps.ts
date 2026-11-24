import { useCallback, useEffect, useState } from 'react';
import { PERFORMANCE_TEXTS } from '@/modules/performance/constants/texts';
import type { StartupEntry } from '@/modules/performance/interfaces/startupEntry';
import { getStartupApps, setStartupApp } from '@/modules/performance/services/performance';

// Read once when the screen opens; a switch changes only its own entry and reads the list again.
export const useStartupApps = () => {
  const [entries, setEntries] = useState<StartupEntry[] | null>(null);
  const [busy, setBusy]       = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const reload = useCallback(() => getStartupApps().then(setEntries).catch(() => setEntries([])), []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = useCallback((entry: StartupEntry, enabled: boolean) => {
    setBusy(entry.id);
    setError(null);
    void setStartupApp({ id: entry.id, enabled })
      .catch((reason: unknown) => setError(typeof reason === 'string' ? reason : PERFORMANCE_TEXTS.startError))
      .then(reload)
      .finally(() => setBusy(null));
  }, [reload]);

  return { entries, busy, error, toggle };
};
