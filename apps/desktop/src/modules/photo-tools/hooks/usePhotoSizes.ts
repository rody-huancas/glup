import { useEffect, useState } from 'react';
import { getPhotoSizes } from '@/modules/photo-tools/services/photoTools';

// The size of each photo as shown, read once for the screen.
export const usePhotoSizes = (paths: string[]) => {
  const [sizes, setSizes] = useState<([number, number] | null)[]>([]);

  useEffect(() => {
    let active = true;
    void getPhotoSizes(paths).then((next) => active && setSizes(next)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [paths]);

  return sizes;
};
