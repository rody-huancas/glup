import { useCallback, useState } from 'react';
import { undoRename } from '@/modules/rename/services/rename';

// «Deshacer» of a rename, from the screen or the Historial.
export const useRenameUndo = () => {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const undo = useCallback((id: string) => {
    setRunning(true);
    void undoRename(id)
      .then((summary) => setMessage(summary.message))
      .catch((failure: unknown) => setMessage(String(failure)))
      .finally(() => setRunning(false));
  }, []);

  return { running, message, undo };
};
