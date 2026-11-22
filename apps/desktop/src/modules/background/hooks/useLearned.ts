import { useCallback, useEffect, useState } from 'react';
import type { ModelStatus } from '@/modules/background/interfaces/modelStatus';
import { deleteBackgroundModel, getBackgroundModel } from '@/modules/background/services/backgroundModel';
import { getModelDownloadId } from '@/modules/background/store/modelDownload';
import { useIslandHold } from '@/modules/island/hooks/useIslandHold';
import { useTasks } from '@/modules/tasks/hooks/useTasks';

// "Lo que aprendí" in Ajustes: what was downloaded and how much it takes, with "Borrar" (confirmed first).
export const useLearned = () => {
  const [status, setStatus]         = useState<ModelStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [failed, setFailed]         = useState(false);
  const download                    = useTasks().find((task) => task.id === getModelDownloadId());
  const downloadDone                = download?.status === 'done';

  useIslandHold(confirming);

  const refresh = useCallback(() => {
    void getBackgroundModel().then(setStatus).catch(() => setStatus(null));
  }, []);

  // Again when a download ends while Ajustes is open.
  useEffect(refresh, [refresh, downloadDone]);

  const remove = useCallback(() => {
    setConfirming(false);
    setDeleting(true);
    setFailed(false);

    void deleteBackgroundModel()
      .catch(() => setFailed(true))
      .finally(() => {
        setDeleting(false);
        refresh();
      });
  }, [refresh]);

  return {
    status,
    deleting,
    failed,
    confirming,
    ask     : () => setConfirming(true),
    cancel  : () => setConfirming(false),
    confirm : remove,
  };
};
