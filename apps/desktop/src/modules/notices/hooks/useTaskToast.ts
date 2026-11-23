import { useEffect, useSyncExternalStore } from 'react';
import { TOAST_TIME } from '@/modules/notices/constants/notices';
import { dismissToast, getToasts, subscribeToasts } from '@/modules/notices/store/toastStore';

// The toast on screen, which goes away on its own after TOAST_TIME.
export const useTaskToast = () => {
  const { current } = useSyncExternalStore(subscribeToasts, getToasts);

  useEffect(() => {
    if (!current) return;

    const timer = window.setTimeout(dismissToast, TOAST_TIME);
    return () => window.clearTimeout(timer);
  }, [current]);

  return current;
};
