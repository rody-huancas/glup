import { useCallback, useEffect, useRef, useState } from 'react';

// The question to download FFmpeg inside the scanner: asked by itself the first time a photo needs it,
// then from the notice; «Ahora no» puts it away.
export type ScanLearning = 'asking' | 'downloading' | null;

export const useScanLearning = (needed: boolean, onLearned: () => void) => {
  const [learning, setLearning] = useState<ScanLearning>(null);
  const asked                   = useRef(false);

  useEffect(() => {
    if (!needed || asked.current) return;
    asked.current = true;
    setLearning('asking');
  }, [needed]);

  const ready = useCallback(() => {
    setLearning(null);
    onLearned();
  }, [onLearned]);

  return {
    learning,
    ask     : useCallback(() => setLearning('asking'), []),
    started : useCallback(() => setLearning('downloading'), []),
    stopped : useCallback(() => setLearning('asking'), []),
    ready,
    later   : useCallback(() => setLearning(null), []),
  };
};
