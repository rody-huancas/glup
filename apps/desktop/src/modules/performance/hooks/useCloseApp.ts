import { useCallback, useState } from 'react';
import { useIslandHold } from '@/modules/island/hooks/useIslandHold';
import { CLOSE_TEXTS } from '@/modules/performance/constants/texts';
import type { AppUsage } from '@/modules/performance/interfaces/appUsage';
import type { CloseRequest } from '@/modules/performance/interfaces/closeRequest';
import { closeApp, forceCloseApp } from '@/modules/performance/services/performance';

const messageOf = (reason: unknown): string => (typeof reason === 'string' ? reason : CLOSE_TEXTS.stuck);

// "Cerrar": asked first; then its windows are asked to close; only if it does not, "Forzar" is offered.
// The island stays open while the dialog is on screen.
export const useCloseApp = (onDone: () => void) => {
  const [request, setRequest] = useState<CloseRequest | null>(null);
  const [noWindow, setNoWindow] = useState(false);
  useIslandHold(request !== null);

  const ask = useCallback((app: AppUsage) => {
    if (app.protected) return;
    setNoWindow(false);
    setRequest({ app, step: 'confirm', error: null });
  }, []);

  const cancel = useCallback(() => setRequest((current) => (current && (current.step === 'closing' || current.step === 'forcing') ? current : null)), []);

  const confirm = useCallback(() => {
    if (!request || request.step !== 'confirm') return;
    const app = request.app;
    setRequest({ app, step: 'closing', error: null });

    void closeApp(app.id)
      .then((outcome) => {
        if (outcome === 'closed') {
          setRequest(null);
          onDone();
          return;
        }
        setNoWindow(outcome === 'noWindow');
        setRequest({ app, step: 'stuck', error: null });
      })
      .catch((reason: unknown) => setRequest({ app, step: 'stuck', error: messageOf(reason) }));
  }, [request, onDone]);

  const force = useCallback(() => {
    if (!request || request.step !== 'stuck') return;
    const app = request.app;
    setRequest({ app, step: 'forcing', error: null });

    void forceCloseApp(app.id)
      .then(() => {
        setRequest(null);
        onDone();
      })
      .catch((reason: unknown) => setRequest({ app, step: 'stuck', error: messageOf(reason) }));
  }, [request, onDone]);

  return { request, noWindow, ask, cancel, confirm, force };
};
