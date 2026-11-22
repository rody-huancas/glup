import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';
import { fetchHistory } from '@/modules/history/services/history';
import { HISTORY_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// Reloads whenever Rust saves a finished action.
export const useHistory = (limit?: number) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [now, setNow]         = useState(() => new Date());

  const reload = useCallback(() => {
    void fetchHistory()
      .then((result) => {
        setEntries(result);
        setNow(new Date());
      })
      .catch(() => undefined);
  }, []);

  useEffect(reload, [reload]);
  useTauriEvent<null>(HISTORY_CHANGED_EVENT, reload);

  const visible = useMemo(() => (limit ? entries.slice(0, limit) : entries), [entries, limit]);

  return { entries: visible, now };
};
