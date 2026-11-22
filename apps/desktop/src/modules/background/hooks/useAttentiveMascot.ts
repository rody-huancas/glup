import { useEffect, useRef } from 'react';
import type { MascotController } from '@/modules/mascot/interfaces/controller';

// Glup listens (alert) while asking, and works while downloading.
export const useAttentiveMascot = (working: boolean) => {
  const controllerRef = useRef<MascotController | null>(null);

  useEffect(() => {
    controllerRef.current?.setState(working ? { type: 'working' } : { type: 'alert' });
  }, [working]);

  return controllerRef;
};
