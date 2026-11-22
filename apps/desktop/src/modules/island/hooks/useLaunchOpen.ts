import { useEffect, useRef } from 'react';
import { logIsland } from '@/modules/island/utils/islandLog';
import { openOnLaunch } from '@/modules/island/utils/launchOpen';
import { takeLaunchOpen } from '@/modules/settings/services/startup';

interface UseLaunchOpenParams {
  onOpen: () => void;
}

// Opened by the person (Start menu, shortcut) and not by Windows at startup: the island expands
// pinned once per process. Rust keeps that decision, so a webview reload or a remount never repeats it.
export const useLaunchOpen = ({ onOpen }: UseLaunchOpenParams) => {
  const openRef = useRef(onOpen);

  useEffect(() => {
    openRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    void openOnLaunch({
      take   : takeLaunchOpen,
      onOpen : () => {
        logIsland('abrir fijada: arranque a mano');
        openRef.current();
      },
    });
  }, []);
};

// Previous version: every mount took itself for the launch (Vite reloads, webview recoveries).
// export const useLaunchOpen = ({ onOpen }: UseLaunchOpenParams) => {
//   const openRef = useRef(onOpen);
//
//   useEffect(() => {
//     openRef.current = onOpen;
//   }, [onOpen]);
//
//   useEffect(() => {
//     let active = true;
//
//     void getLaunchInfo()
//       .then((info) => {
//         if (active && !info.autostart) openRef.current();
//       })
//       .catch(() => undefined);
//
//     return () => {
//       active = false;
//     };
//   }, []);
// };
