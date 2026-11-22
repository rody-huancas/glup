import { useEffect, useRef } from 'react';
import { ISLAND_WATCHDOG_INTERVAL } from '@/modules/island/constants/island';
import type { IslandEvent, IslandMachine } from '@/modules/island/interfaces/islandMachine';
import { getIslandArea } from '@/modules/island/utils/islandArea';
import { logIsland } from '@/modules/island/utils/islandLog';
import { areaKindFor, isSettledPhase } from '@/modules/island/utils/islandMachine';
import { getIslandStatus, setIslandArea } from '@/modules/island/utils/islandWindow';

const STALL_CHECKS = 2;

interface UseIslandWatchdogParams {
  machine  : IslandMachine;
  send     : (event: IslandEvent) => void;
  // True while an animation runs (the region is in flux on purpose).
  isMoving : () => boolean;
}

// Every 2 s the machine is compared with the real window; any difference is fixed and logged.
// Rust keeps its own watch over visibility, size and the applied region (island_watchdog.rs).
export const useIslandWatchdog = ({ machine, send, isMoving }: UseIslandWatchdogParams) => {
  const current = useRef({ machine, send, isMoving });
  const stalled = useRef(0);

  useEffect(() => {
    current.current = { machine, send, isMoving };
  }, [machine, send, isMoving]);

  useEffect(() => {
    const check = async () => {
      const status = await getIslandStatus().catch(() => null);
      const now    = current.current.machine;
      const emit   = current.current.send;
      const moving = current.current.isMoving;
      if (!status) return;

      if (now.fullscreen !== status.fullscreen) {
        logIsland(`vigilante: pantalla completa desincronizada (${now.fullscreen} ≠ ${status.fullscreen})`);
        emit({ type: 'fullscreen', on: status.fullscreen });
        return;
      }

      if (now.trayHidden !== status.trayHidden) {
        logIsland(`vigilante: bandeja desincronizada (${now.trayHidden} ≠ ${status.trayHidden})`);
        emit({ type: 'tray', hidden: status.trayHidden });
        return;
      }

      // An animated phase with nothing animating (a lost settle): twice in a row means it is stuck.
      const animated = now.phase === 'expanding' || now.phase === 'collapsing' || now.phase === 'notice';
      stalled.current = animated && !moving() ? stalled.current + 1 : 0;

      if (stalled.current >= STALL_CHECKS) {
        logIsland(`vigilante: ${now.phase} sin animación, vuelvo a la pastilla`);
        stalled.current = 0;
        emit({ type: 'reset' });
        return;
      }

      if (!isSettledPhase(now.phase) || moving()) return;

      const expected = getIslandArea(areaKindFor(now.phase));

      if (status.area.width !== expected.width || status.area.height !== expected.height) {
        logIsland(`vigilante: región ${status.area.width}x${status.area.height} en ${now.phase}, corrijo a ${expected.width}x${expected.height}`);
        await setIslandArea(expected);
      }
    };

    const timer = window.setInterval(() => void check(), ISLAND_WATCHDOG_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);
};
