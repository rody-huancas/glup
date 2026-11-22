import { useEffect, useRef } from 'react';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import { WAVE_INTERVAL } from '@/modules/welcome/constants/welcome';

// Glup waves (arm-wave) right away and again every few seconds; with reduced motion the gesture
// itself does not move (see useMascotLimbs).
export const useWaveLoop = () => {
  const controllerRef = useRef<MascotController | null>(null);

  useEffect(() => {
    const wave  = () => void controllerRef.current?.gesture('wave');
    const first = window.setTimeout(wave, 400);
    const timer = window.setInterval(wave, WAVE_INTERVAL);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  return controllerRef;
};
