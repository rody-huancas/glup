import { useEffect, useState } from 'react';
import { getPhotoPreview } from '@/modules/photo-tools/services/photoTools';

// The preview of one photo (made by Rust, upright), let go when another one is shown.
export const usePhotoPreview = (path: string | null, size = 1600) => {
  const [url, setUrl]       = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!path) return;
    let active  = true;
    let created: string | null = null;
    setUrl(null);
    setFailed(false);
    void getPhotoPreview({ path, size })
      .then((next) => {
        created = next;
        if (active) setUrl(next);
        else URL.revokeObjectURL(next);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [path, size]);

  return { url, failed };
};
