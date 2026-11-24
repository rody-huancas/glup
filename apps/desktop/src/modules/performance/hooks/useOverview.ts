import { useCallback, useEffect, useState } from 'react';
import { usePanelOpen } from '@/modules/island/hooks/usePanelOpen';
import { REFRESH_MS } from '@/modules/performance/constants/thresholds';
import type { Overview } from '@/modules/performance/interfaces/overview';
import { getPerformance } from '@/modules/performance/services/performance';

const isDocumentVisible = (): boolean => document.visibilityState === 'visible';

// A reading every 2 seconds, only while the screen is in view (the panel open and the window shown):
// with the island collapsed nothing is read.
export const useOverview = () => {
  const open                      = usePanelOpen();
  const [visible, setVisible]     = useState(isDocumentVisible);
  const [overview, setOverview]   = useState<Overview | null>(null);
  const [failed, setFailed]       = useState(false);

  useEffect(() => {
    const update = () => setVisible(isDocumentVisible());
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  const read = useCallback(() => getPerformance().then((value) => {
    setOverview(value);
    setFailed(false);
  }).catch(() => setFailed(true)), []);

  useEffect(() => {
    if (!open || !visible) return;

    let active = true;
    let timer  = 0;
    // The next one is asked when the last one answered: they never pile up.
    const loop = () => {
      void read().finally(() => {
        if (active) timer = window.setTimeout(loop, REFRESH_MS);
      });
    };
    loop();

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, visible, read]);

  return { overview, failed, refresh: read };
};
