import { useEffect } from 'react';
import type { RefObject } from 'react';
import gsap from 'gsap';
import { CHEWING } from '@/modules/home/constants/chewing';
import type { MascotController } from '@/modules/mascot/interfaces/controller';

interface UseChewingParams {
  mascotRef : RefObject<MascotController | null>;
  active    : boolean;
}

export const useChewing = ({ mascotRef, active }: UseChewingParams) => {
  useEffect(() => {
    const controller = mascotRef.current;
    if (!active || !controller) return;

    const body = controller.elements.act.current;
    let bites  = 0;

    const bite = () => {
      bites += 1;
      controller.express({ mouth: CHEWING.mouths[bites % CHEWING.mouths.length] });

      if (!body) return;

      const { scaleX, scaleY, duration, ease, origin } = CHEWING.squash;
      gsap.fromTo(body, { scaleX, scaleY, transformOrigin: origin }, { scaleX: 1, scaleY: 1, duration, ease, overwrite: true });
    };

    bite();
    const timer = window.setInterval(bite, CHEWING.interval);

    return () => {
      window.clearInterval(timer);
      controller.express(null);

      if (body) {
        gsap.killTweensOf(body);
        gsap.set(body, { clearProps: 'transform' });
      }
    };
  }, [active, mascotRef]);
};
