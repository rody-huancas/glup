import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { DROP_ZONE_MOTION, DROP_ZONE_SIZES } from '@/modules/home/constants/dropZone';

// The mint strip of Inicio, or a one-line bar while files are chosen or a task shows: the strip gets
// shorter, Glup small, and the question gives way to the bar's line. The first layout is applied without
// animation, and so is every change with reduced motion.
export const useDropZoneLayout = (compact: boolean) => {
  const zone   = useRef<HTMLElement | null>(null);
  const mascot = useRef<HTMLDivElement | null>(null);
  const full   = useRef<HTMLDivElement | null>(null);
  const bar    = useRef<HTMLDivElement | null>(null);
  const first  = useRef(true);

  useGSAP(
    () => {
      const [box, glup, big, line] = [zone.current, mascot.current, full.current, bar.current];
      if (!box || !glup || !big || !line) return;

      const still    = first.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = still ? 0 : DROP_ZONE_MOTION.duration;
      const ease     = DROP_ZONE_MOTION.ease;
      const from     = box.getBoundingClientRect().height;
      const sizes    = DROP_ZONE_SIZES;
      first.current  = false;

      if (compact) {
        gsap.set(box, { minHeight: sizes.compactHeight, height: from });
        gsap.to(box, {
          height        : sizes.compactHeight,
          paddingTop    : sizes.compactPadding,
          paddingBottom : sizes.compactPadding,
          paddingLeft   : sizes.compactSide,
          paddingRight  : sizes.compactSide,
          columnGap     : sizes.compactGap,
          duration,
          ease,
        });
        gsap.to(glup, { width: sizes.compactMascot, duration, ease });
        gsap.to(big, { opacity: 0, duration: duration / 2, ease, onComplete: () => void gsap.set(big, { display: 'none' }) });
        gsap.set(line, { display: 'flex' });
        gsap.fromTo(line, { opacity: 0 }, { opacity: 1, duration, delay: duration / 2, ease });
        return;
      }

      // Measure the strip's own height, then animate there and hand back to the stylesheet.
      gsap.set(line, { display: 'none' });
      gsap.set(big, { display: 'flex', opacity: 0 });
      gsap.set(box, { height: 'auto', minHeight: sizes.height, paddingTop: sizes.padding, paddingBottom: sizes.padding, paddingLeft: sizes.side, paddingRight: sizes.side, columnGap: sizes.gap });
      const to = box.getBoundingClientRect().height;

      gsap.set(box, {
        minHeight     : sizes.compactHeight,
        height        : from,
        paddingTop    : sizes.compactPadding,
        paddingBottom : sizes.compactPadding,
        paddingLeft   : sizes.compactSide,
        paddingRight  : sizes.compactSide,
        columnGap     : sizes.compactGap,
      });
      gsap.to(box, {
        height        : to,
        paddingTop    : sizes.padding,
        paddingBottom : sizes.padding,
        paddingLeft   : sizes.side,
        paddingRight  : sizes.side,
        columnGap     : sizes.gap,
        duration,
        ease,
        onComplete    : () => void gsap.set(box, { clearProps: 'height,minHeight,paddingTop,paddingBottom,paddingLeft,paddingRight,columnGap' }),
      });
      gsap.to(glup, { width: sizes.mascot, duration, ease });
      gsap.to(big, { opacity: 1, duration, delay: duration / 2, ease });
    },
    { dependencies: [compact] },
  );

  return { zone, mascot, full, bar };
};
