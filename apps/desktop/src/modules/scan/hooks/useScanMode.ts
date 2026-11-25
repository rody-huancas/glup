import { useCallback, useState } from 'react';
import type { ScanTarget } from '@/modules/scan/interfaces/scanTarget';

// The photos being scanned; while there are some, the panel shows the scanning screen.
export const useScanMode = () => {
  const [target, setTarget] = useState<ScanTarget | null>(null);

  const start = useCallback((paths: string[]) => setTarget({ paths }), []);
  const stop  = useCallback(() => setTarget(null), []);

  return { target, start, stop };
};
