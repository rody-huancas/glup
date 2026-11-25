import { useCallback, useEffect, useRef, useState } from 'react';
import { DOCK_COMMIT_DELAY } from '@/modules/dock/constants/dock';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import { createDeferredCommit } from '@/modules/dock/utils/deferredCommit';
import { logPosition } from '@/modules/island/utils/islandLog';

// The slider and the arrows of Ajustes: the drawing's marker follows at once; the island moves once.
// Pressed (the slider held down) only on release, wherever the button comes up (the window hears it, the
// slider may not); with the arrows, after a short pause. Leaving Ajustes applies what was waiting.
export const useDeferredDock = (commit: (dock: IslandDock) => void) => {
  const [pending, setPending] = useState<IslandDock | null>(null);
  const latest                = useRef(commit);
  const deferred              = useRef(createDeferredCommit<IslandDock>({
    delay    : DOCK_COMMIT_DELAY,
    commit   : (dock) => {
      logPosition(`aplico ${dock.edge} ${Math.round(dock.offset * 100)} %`);
      latest.current(dock);
    },
    onChange : setPending,
  }));

  useEffect(() => {
    latest.current = commit;
  }, [commit]);

  useEffect(() => {
    const current = deferred.current;
    return () => current.release();
  }, []);

  const press = useCallback(() => {
    logPosition('deslizador presionado');
    deferred.current.press();
    const up = (event: PointerEvent) => {
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      logPosition(`deslizador suelto (${event.type})`);
      deferred.current.release();
    };
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
  }, []);

  return { pending, press, hold: deferred.current.hold, release: deferred.current.release, cancel: deferred.current.cancel };
};
