import { useCallback, useEffect, useState } from 'react';
import type { Learnable } from '@/modules/background/interfaces/learnable';
import type { Learned } from '@/modules/background/interfaces/learned';
import type { ModelStatus } from '@/modules/background/interfaces/modelStatus';
import { getModelDownloadId } from '@/modules/background/store/modelDownload';
import { useIslandHold } from '@/modules/island/hooks/useIslandHold';
import { useTasks } from '@/modules/tasks/hooks/useTasks';

// One line of "Lo que aprendí" in Ajustes: what was downloaded and how much it takes, with "Borrar"
// (confirmed first).
export const useLearned = (learnable: Learnable): Learned => {
  const [status, setStatus]         = useState<ModelStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [failed, setFailed]         = useState(false);
  const download                    = useTasks().find((task) => task.id === getModelDownloadId(learnable.id));
  const downloadDone                = download?.status === 'done';
  const { getStatus, remove }       = learnable;

  useIslandHold(confirming);

  const refresh = useCallback(() => {
    void getStatus().then(setStatus).catch(() => setStatus(null));
  }, [getStatus]);

  // Again when a download ends while Ajustes is open.
  useEffect(refresh, [refresh, downloadDone]);

  const confirm = useCallback(() => {
    setConfirming(false);
    setDeleting(true);
    setFailed(false);

    void remove()
      .catch(() => setFailed(true))
      .finally(() => {
        setDeleting(false);
        refresh();
      });
  }, [remove, refresh]);

  return {
    learnable,
    status,
    deleting,
    failed,
    confirming,
    ask    : () => setConfirming(true),
    cancel : () => setConfirming(false),
    confirm,
  };
};
