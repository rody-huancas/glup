import { useCallback, useEffect, useState } from 'react';
import type { Learnable } from '@/modules/background/interfaces/learnable';
import type { ModelStatus } from '@/modules/background/interfaces/modelStatus';
import { getModelDownloadId, startModelDownload } from '@/modules/background/store/modelDownload';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { cancelTask, dismissTaskResult } from '@/modules/tasks/store/taskStore';

interface UseModelDownloadParams {
  learnable   : Learnable;
  // The step shows the download (true) or the question.
  downloading : boolean;
  onStarted   : () => void;
  // Cancelled or failed: back to the question.
  onStopped   : () => void;
  onReady     : () => void;
}

// The "learn something new" step: the size to ask with, and the download task while it runs.
// When it ends, the step takes its result (the task card would repeat it).
export const useModelDownload = ({ learnable, downloading, onStarted, onStopped, onReady }: UseModelDownloadParams) => {
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const tasks               = useTasks();
  const task                = tasks.find((item) => item.id === getModelDownloadId(learnable.id)) ?? null;
  const getStatus           = learnable.getStatus;

  useEffect(() => {
    void getStatus().then(setStatus).catch(() => setStatus(null));
  }, [getStatus]);

  const finishedResult = task?.status === 'done' ? task.result : null;

  useEffect(() => {
    if (!downloading) return;

    // Back on the step after the download already ended (or never started here): ask Rust.
    if (!task) {
      void getStatus().then((next) => (next.installed ? onReady() : onStopped())).catch(onStopped);
      return;
    }

    if (!finishedResult) return;

    dismissTaskResult(task.id);
    void getStatus()
      .then((next) => {
        setStatus(next);
        if (next.installed) return onReady();

        setError(finishedResult.tone === 'failed' ? finishedResult.message : null);
        onStopped();
      })
      .catch(onStopped);
  }, [downloading, task, finishedResult, getStatus, onReady, onStopped]);

  const start = useCallback(() => {
    setError(null);
    startModelDownload(learnable);
    onStarted();
  }, [learnable, onStarted]);

  const cancel = useCallback(() => {
    if (task) cancelTask(task.id);
  }, [task]);

  return { status, error, task, start, cancel };
};
