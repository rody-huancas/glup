import { useEffect, useState } from 'react';
import type { DiskSpace } from '@/modules/cleanup/interfaces/diskSpace';
import { getDiskSpace } from '@/modules/cleanup/services/cleanup';

// Read when the page opens and again after each cleaning.
export const useDiskSpace = (version: number) => {
  const [space, setSpace]   = useState<DiskSpace | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    void getDiskSpace()
      .then((value) => {
        if (!active) return;
        setSpace(value);
        setFailed(false);
      })
      .catch(() => active && setFailed(true));

    return () => {
      active = false;
    };
  }, [version]);

  return { space, failed };
};
