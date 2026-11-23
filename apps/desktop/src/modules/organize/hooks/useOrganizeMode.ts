import { useCallback, useState } from 'react';
import { getFileName } from '@/modules/actions/utils/paths';
import type { OrganizeTarget } from '@/modules/organize/interfaces/organizeTarget';

// The PDF being organized; while there is one, the panel shows the organizing screen.
export const useOrganizeMode = () => {
  const [target, setTarget] = useState<OrganizeTarget | null>(null);

  const start = useCallback((path: string) => setTarget({ path, name: getFileName(path) }), []);
  const stop  = useCallback(() => setTarget(null), []);

  return { target, start, stop };
};
