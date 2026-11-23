import { useEffect, useState } from 'react';
import { IMAGE_TYPE } from '@/modules/clipboard/constants/clipboard';
import { getClipImage } from '@/modules/clipboard/services/clipboard';

// The thumbnail of an image, decrypted by Rust and kept only as a blob of this page while it is on screen.
export const useClipThumb = (id: string) => {
  const [url, setUrl]       = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let created: string | null = null;
    let live                   = true;

    void getClipImage(id, true)
      .then((bytes) => {
        if (!live) return;
        created = URL.createObjectURL(new Blob([bytes], { type: IMAGE_TYPE }));
        setUrl(created);
      })
      .catch(() => live && setFailed(true));

    return () => {
      live = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [id]);

  return { url, failed };
};
