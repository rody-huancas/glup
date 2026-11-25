import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import { dockRegion, regionShape } from '@/modules/dock/utils/dockLayout';
import { ISLAND_WATCHDOG_INTERVAL } from '@/modules/island/constants/island';
import type { IslandEvent, IslandMachine } from '@/modules/island/interfaces/islandMachine';
import { logIsland } from '@/modules/island/utils/islandLog';
import { areaKindFor, isSettledPhase } from '@/modules/island/utils/islandMachine';
import { isStuckDrag, isUnresponsive, STUCK_DRAG_CHECKS } from '@/modules/island/utils/responsiveness';
import { getIslandStatus, setIslandArea } from '@/modules/island/utils/islandWindow';

const STALL_CHECKS = 2;

interface UseIslandWatchdogParams {
  machine      : IslandMachine;
  send         : (event: IslandEvent) => void;
  // True while an animation runs (the region is in flux on purpose).
  isMoving     : () => boolean;
  // Where the island is docked: the region it should have is the one of that edge.
  placementRef : RefObject<IslandPlacement>;
  // Since when an opening is asked for (the cursor on the pill, a click) and not done.
  askedAt      : RefObject<number | null>;
}

// Every 2 s the machine is compared with the real window; any difference is fixed and logged.
// Rust keeps its own watch over visibility, the frame of the dock and the applied region (island_watchdog.rs).
export const useIslandWatchdog = ({ machine, send, isMoving, placementRef, askedAt }: UseIslandWatchdogParams) => {
  const current = useRef({ machine, send, isMoving });
  const stalled = useRef(0);
  const stuck   = useRef(0);

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

      if (now.capturing !== status.capturing) {
        logIsland(`vigilante: captura desincronizada (${now.capturing} ≠ ${status.capturing})`);
        emit({ type: 'capture', on: status.capturing });
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

      // "Being dragged" while Rust follows no drag: the drop was lost, and nothing would open it.
      stuck.current = isStuckDrag(now, status.dragging) ? stuck.current + 1 : 0;
      if (stuck.current >= STUCK_DRAG_CHECKS) {
        logIsland('vigilante: arrastrada sin arrastre en Rust (se perdió la soltada), la suelto y vuelvo a la pastilla');
        stuck.current = 0;
        emit({ type: 'moving', on: false });
        emit({ type: 'reset' });
        return;
      }

      // Asked to open (hover or click) and still closed after a while: whatever holds it, back to a clean pill.
      if (isUnresponsive({ askedAt: askedAt.current, now: Date.now(), phase: now.phase, dragging: status.dragging })) {
        const waited = Math.round((Date.now() - (askedAt.current ?? Date.now())) / 1000);
        logIsland(`vigilante: no responde al hover ni al clic hace ${waited} s (${now.phase}, arrastrando=${now.moving}, bloqueada=${now.locked}, retenida=${now.holds.join(',') || 'nada'}), la reinicio a recogida`);
        askedAt.current = null;
        emit({ type: 'reset' });
        return;
      }

      // While dragged the region follows the cursor: nothing to compare until it is dropped.
      if (!isSettledPhase(now.phase) || moving() || now.moving) return;

      const kind     = areaKindFor(now.phase);
      const expected = dockRegion(placementRef.current, kind);
      const actual   = status.area;
      const same     = (['x', 'y', 'width', 'height'] as const).every((key) => Math.abs(actual[key] - expected[key]) < 0.5);

      if (!same) {
        logIsland(`vigilante: región ${actual.width}x${actual.height} en ${actual.x},${actual.y} (${now.phase}), corrijo a ${expected.width}x${expected.height} en ${expected.x},${expected.y}`);
        await setIslandArea(expected, regionShape(placementRef.current, kind));
      }
    };

    const timer = window.setInterval(() => void check(), ISLAND_WATCHDOG_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);
};
