import { useEffect, useRef } from 'react';
import { getLaunchInfo } from '@/modules/settings/services/startup';

interface UseLaunchOpenParams {
  onOpen: () => void;
}

// Opened by the person (Start menu, shortcut) and not by Windows at startup: the island expands
// pinned once, so it is clear Glup is running.
export const useLaunchOpen = ({ onOpen }: UseLaunchOpenParams) => {
  const openRef = useRef(onOpen);

  useEffect(() => {
    openRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    let active = true;

    void getLaunchInfo()
      .then((info) => {
        if (active && !info.autostart) openRef.current();
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);
};
