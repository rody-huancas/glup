import { useCallback, useEffect, useState } from 'react';
import { PAUSE_MINUTES } from '@/modules/clipboard/constants/clipboard';
import type { ClipboardStatus } from '@/modules/clipboard/interfaces/clipboardStatus';
import { getClipboardStatus, pauseClipboard, setClipboardEnabled } from '@/modules/clipboard/services/clipboard';
import { CLIPBOARD_CHANGED_EVENT, SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// On or off, paused or not: again whenever Rust says it changed (the tray pauses it too).
export const useClipboardStatus = () => {
  const [status, setStatus] = useState<ClipboardStatus | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(() => {
    void getClipboardStatus()
      .then((next) => {
        setStatus(next);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(reload, [reload]);
  useTauriEvent<null>(CLIPBOARD_CHANGED_EVENT, reload);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  const apply = useCallback((work: Promise<ClipboardStatus>) => {
    void work.then(setStatus).catch(() => setFailed(true));
  }, []);

  const setEnabled = useCallback((enabled: boolean) => apply(setClipboardEnabled(enabled)), [apply]);
  const pause      = useCallback(() => apply(pauseClipboard(PAUSE_MINUTES)), [apply]);
  const resume     = useCallback(() => apply(pauseClipboard(null)), [apply]);

  return { status, failed, setEnabled, pause, resume, apply };
};
