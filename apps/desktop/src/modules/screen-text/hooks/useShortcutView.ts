import { useCallback, useEffect, useState } from 'react';
import type { ShortcutView } from '@/modules/screen-text/interfaces/shortcutView';
import { getScreenTextShortcut } from '@/modules/screen-text/services/screenText';
import { SETTINGS_CHANGED_EVENT } from '@/shared/constants/events';
import { useTauriEvent } from '@/shared/hooks/useTauriEvent';

// The shortcut as it is now; again whenever settings.json changes (a new one saves it there).
export const useShortcutView = () => {
  const [view, setView]     = useState<ShortcutView | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(() => {
    void getScreenTextShortcut()
      .then((next) => {
        setView(next);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(reload, [reload]);
  useTauriEvent<null>(SETTINGS_CHANGED_EVENT, reload);

  return { view, setView, failed };
};
