import { useEffect, useRef } from 'react';
import { GAZE } from '@/modules/mascot/constants/animation';
import type { ElementRef } from '@/modules/mascot/interfaces/elements';
import { getCursorGaze, getScreenCenter } from '@/modules/mascot/utils/gaze';
import { useGlobalCursor } from '@/shared/hooks/useGlobalCursor';
import { useWindowPosition } from '@/shared/hooks/useWindowPosition';
import type { Point } from '@/shared/interfaces/point';
import { lerpPoint } from '@/shared/utils/math';

interface UseEyeTrackingParams {
  eyes      : ElementRef;
  fixedGaze : Point | null;
}

export const useEyeTracking = ({ eyes, fixedGaze }: UseEyeTrackingParams) => {
  const cursor         = useGlobalCursor();
  const windowPosition = useWindowPosition();
  const fixedRef       = useRef(fixedGaze);

  useEffect(() => {
    fixedRef.current = fixedGaze;
  }, [fixedGaze]);

  useEffect(() => {
    let frame          = 0;
    let current: Point = { x: 0, y: 0 };

    const tick = () => {
      const element = eyes.current;

      if (element) {
        const anchor = getScreenCenter({ element, windowPosition: windowPosition.current });
        const target = fixedRef.current ?? getCursorGaze({ cursor: cursor.current, anchor });
        const reach  = element.offsetWidth * GAZE.maxOffset;

        current                 = lerpPoint({ from: current, to: target, factor: GAZE.smoothing });
        element.style.transform = `translate(${current.x * reach}px, ${current.y * reach}px)`;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [eyes, cursor, windowPosition]);
};
