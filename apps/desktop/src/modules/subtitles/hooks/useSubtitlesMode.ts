import { useCallback, useState } from 'react';
import { getFileName } from '@/modules/actions/utils/paths';
import type { TrimTarget } from '@/modules/media/interfaces/trimTarget';

// The video getting its subtitles; while there is one, the panel shows their screen.
export const useSubtitlesMode = () => {
  const [target, setTarget] = useState<TrimTarget | null>(null);

  const start = useCallback((path: string) => setTarget({ path, name: getFileName(path), purpose: 'trim' }), []);
  const stop  = useCallback(() => setTarget(null), []);

  return { target, start, stop };
};
