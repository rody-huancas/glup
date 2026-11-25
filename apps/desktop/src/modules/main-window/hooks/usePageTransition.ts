import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { PAGE_MOTION } from '@/modules/main-window/constants/pageMotion';
import type { PageId } from '@/modules/main-window/types/pageId';

// Each screen comes in softly (a short rise and fade) when the page changes: Inicio, a family,
// Habilidades. The first one, and every one with reduced motion, just shows.
export const usePageTransition = (page: PageId) => {
  const box   = useRef<HTMLDivElement | null>(null);
  const first = useRef(true);

  useGSAP(
    () => {
      const element = box.current;
      if (!element) return;
      if (first.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        first.current = false;
        return;
      }
      gsap.fromTo(element, { opacity: 0, y: PAGE_MOTION.rise }, { opacity: 1, y: 0, duration: PAGE_MOTION.duration, ease: PAGE_MOTION.ease, clearProps: 'opacity,transform' });
    },
    { dependencies: [page] },
  );

  return box;
};
