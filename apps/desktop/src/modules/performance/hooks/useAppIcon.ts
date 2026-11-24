import { useEffect, useState } from 'react';
import { getAppIcon } from '@/modules/performance/services/performance';

export const useAppIcon = (path: string | null): string | null => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    let active = true;
    void getAppIcon(path).then((value) => active && setUrl(value));
    return () => {
      active = false;
    };
  }, [path]);

  return path ? url : null;
};
