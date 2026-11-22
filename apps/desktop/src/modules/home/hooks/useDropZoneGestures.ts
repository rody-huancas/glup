import { useEffect } from 'react';
import type { RefObject } from 'react';
import { DROP_ZONE_GESTURES } from '@/modules/home/constants/dropZoneGestures';
import type { MascotController } from '@/modules/mascot/interfaces/controller';
import { randomBetween } from '@/shared/utils/math';

interface UseDropZoneGesturesParams {
  mascotRef : RefObject<MascotController | null>;
  active    : boolean;
}

export const useDropZoneGestures = ({ mascotRef, active }: UseDropZoneGesturesParams) => {
  useEffect(() => {
    if (!active) return;

    const { minDelay, maxDelay, gestures } = DROP_ZONE_GESTURES;
    let timer = 0;

    const schedule = () => {
      timer = window.setTimeout(() => {
        const gesture = gestures[Math.floor(Math.random() * gestures.length)];
        void mascotRef.current?.gesture(gesture);
        schedule();
      }, randomBetween(minDelay, maxDelay));
    };

    schedule();
    return () => window.clearTimeout(timer);
  }, [active, mascotRef]);
};
