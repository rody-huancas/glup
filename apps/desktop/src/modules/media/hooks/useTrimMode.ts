import { useCallback, useState } from 'react';
import { getFileName } from '@/modules/actions/utils/paths';
import type { TrimTarget } from '@/modules/media/interfaces/trimTarget';

// The file being trimmed; while there is one, the panel shows the trimming screen.
export const useTrimMode = () => {
  const [target, setTarget] = useState<TrimTarget | null>(null);

  const start = useCallback((path: string) => setTarget({ path, name: getFileName(path) }), []);
  const stop  = useCallback(() => setTarget(null), []);

  return { target, start, stop };
};
