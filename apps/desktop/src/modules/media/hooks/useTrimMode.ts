import { useCallback, useState } from 'react';
import { getFileName } from '@/modules/actions/utils/paths';
import type { TrimTarget } from '@/modules/media/interfaces/trimTarget';
import type { TrimPurpose } from '@/modules/media/types/trimPurpose';

// The file being trimmed; while there is one, the panel shows the trimming screen.
export const useTrimMode = () => {
  const [target, setTarget] = useState<TrimTarget | null>(null);

  const start = useCallback((path: string, purpose: TrimPurpose) => setTarget({ path, name: getFileName(path), purpose }), []);
  const stop  = useCallback(() => setTarget(null), []);

  return { target, start, stop };
};
