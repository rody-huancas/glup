import { useCallback, useState } from 'react';
import type { ImageTarget } from '@/modules/photo-tools/interfaces/imageTarget';
import type { ImageScreen } from '@/modules/photo-tools/types/imageScreen';

// The photos on a screen of Imágenes; while there are some, the panel shows that screen.
export const useImageScreen = () => {
  const [target, setTarget] = useState<ImageTarget | null>(null);

  const start = useCallback((screen: ImageScreen, paths: string[]) => setTarget({ screen, paths }), []);
  const stop  = useCallback(() => setTarget(null), []);

  return { target, start, stop };
};
