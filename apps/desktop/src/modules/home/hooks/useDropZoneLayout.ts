import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { DROP_ZONE_MOTION, DROP_ZONE_SIZES } from '@/modules/home/constants/dropZone';

// Big drop zone that fills Home; compact (shorter, smaller Glup, no hint) while the actions panel shows.
// The first layout is applied without animation.
export const useDropZoneLayout = (compact: boolean) => {
  const zone   = useRef<HTMLElement | null>(null);
  const mascot = useRef<HTMLDivElement | null>(null);
  const hint   = useRef<HTMLParagraphElement | null>(null);
  const first  = useRef(true);

  useGSAP(
    () => {
      const [box, glup, text] = [zone.current, mascot.current, hint.current];
      if (!box || !glup || !text) return;

      const duration = first.current ? 0 : DROP_ZONE_MOTION.duration;
      const ease     = DROP_ZONE_MOTION.ease;
      const from     = box.getBoundingClientRect().height;
      const sizes    = DROP_ZONE_SIZES;
      first.current  = false;

      if (compact) {
        gsap.set(box, { flexGrow: 0, minHeight: sizes.compactHeight, height: from });
        gsap.to(box, { height: sizes.compactHeight, paddingTop: sizes.compactPadding, paddingBottom: sizes.compactPadding, duration, ease });
        gsap.to(glup, { width: sizes.compactMascot, duration, ease });
        gsap.to(text, { height: 0, marginTop: 0, opacity: 0, duration, ease });
        return;
      }

      // Measure the height the zone would take filling the column, then animate there and hand back to flex.
      gsap.set(box, { flexGrow: 1, height: 'auto', minHeight: sizes.minHeight, paddingTop: sizes.padding, paddingBottom: sizes.padding });
      const to = box.getBoundingClientRect().height;

      gsap.set(box, { flexGrow: 0, minHeight: sizes.compactHeight, height: from, paddingTop: sizes.compactPadding, paddingBottom: sizes.compactPadding });
      gsap.to(box, {
        height        : to,
        paddingTop    : sizes.padding,
        paddingBottom : sizes.padding,
        duration,
        ease,
        onComplete    : () => void gsap.set(box, { flexGrow: 1, clearProps: 'height,minHeight,paddingTop,paddingBottom' }),
      });
      gsap.to(glup, { width: sizes.mascot, duration, ease });
      gsap.to(text, { height: 'auto', marginTop: sizes.hintGap, opacity: 1, duration, ease });
    },
    { dependencies: [compact] },
  );

  return { zone, mascot, hint };
};
