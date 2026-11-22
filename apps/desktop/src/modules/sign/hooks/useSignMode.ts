import { useCallback, useState } from 'react';
import { getFileName } from '@/modules/actions/utils/paths';
import type { SignTarget } from '@/modules/sign/interfaces/signTarget';

// The PDF being signed; while there is one, the panel shows the signing screen.
export const useSignMode = () => {
  const [target, setTarget] = useState<SignTarget | null>(null);

  const start = useCallback((path: string) => setTarget({ path, name: getFileName(path) }), []);
  const stop  = useCallback(() => setTarget(null), []);

  return { target, start, stop };
};
