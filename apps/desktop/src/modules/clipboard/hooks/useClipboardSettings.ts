import { useCallback, useState } from 'react';
import { useClipboardStatus } from '@/modules/clipboard/hooks/useClipboardStatus';
import { useTurnOffClipboard } from '@/modules/clipboard/hooks/useTurnOffClipboard';
import { pickProgram, setClipboardExcluded, setClipboardLimit } from '@/modules/clipboard/services/clipboard';
import { addProgram, programFile, removeProgram } from '@/modules/clipboard/utils/programs';

// Ajustes › Portapapeles: on or off, how many it keeps and the programs whose copies are never kept.
export const useClipboardSettings = () => {
  const clipboard           = useClipboardStatus();
  const [failed, setFailed] = useState(false);
  const status              = clipboard.status;

  const run = useCallback((work: () => Promise<unknown>) => {
    setFailed(false);
    void work().catch(() => setFailed(true));
  }, []);

  const apply    = clipboard.apply;
  const turnOff  = useTurnOffClipboard({ status, apply });
  const setLimit = useCallback((limit: number) => apply(setClipboardLimit(limit)), [apply]);
  const excluded = status?.excluded ?? [];

  const addOne = useCallback(() => run(async () => {
    const path = await pickProgram();
    if (path) apply(setClipboardExcluded(addProgram(excluded, programFile(path))));
  }), [run, apply, excluded]);

  const removeOne = useCallback((name: string) => apply(setClipboardExcluded(removeProgram(excluded, name))), [apply, excluded]);

  return { status, failed: failed || clipboard.failed, turnOff, setLimit, addOne, removeOne };
};
