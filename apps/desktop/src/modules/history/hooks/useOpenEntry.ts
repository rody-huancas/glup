import { useCallback, useEffect, useRef, useState } from 'react';
import { openFile } from '@/modules/actions/services/files';
import { MISSING_NOTICE_TIME } from '@/modules/history/constants/history';
import type { HistoryEntry } from '@/modules/history/interfaces/historyEntry';

// Opens the saved file; if it was moved or deleted, that entry says so for a moment.
export const useOpenEntry = () => {
  const [missingId, setMissingId] = useState<string | null>(null);
  const timer                     = useRef(0);

  const open = useCallback((entry: HistoryEntry) => {
    if (!entry.path) return;

    void openFile(entry.path)
      .then((opened) => {
        if (opened) return;

        window.clearTimeout(timer.current);
        setMissingId(entry.id);
        timer.current = window.setTimeout(() => setMissingId(null), MISSING_NOTICE_TIME);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { open, missingId };
};
