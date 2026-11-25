import { useCallback, useState } from 'react';
import { undoAutoTrash } from '@/modules/auto-folders/services/autoFolders';

// «Deshacer» in the Historial of an original that a rule sent to the bin: back to its place.
export const useTrashUndo = () => {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const undo = useCallback((record: string) => {
    setRunning(true);
    void undoAutoTrash(record)
      .then(setMessage)
      .catch((failure: unknown) => setMessage(String(failure)))
      .finally(() => setRunning(false));
  }, []);

  return { running, message, undo };
};
