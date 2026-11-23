import { useEffect, useRef } from 'react';
import type { MascotController } from '@/modules/mascot/interfaces/controller';

// Glup scratches its head once when it shows up (the mascot itself handles reduced motion).
export const useConfusedMascot = () => {
  const mascotRef = useRef<MascotController | null>(null);

  useEffect(() => {
    mascotRef.current?.setState({ type: 'confused' });
  }, []);

  return mascotRef;
};
