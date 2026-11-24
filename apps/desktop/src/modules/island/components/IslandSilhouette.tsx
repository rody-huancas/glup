import type { RefObject } from 'react';
import { OUTLINE_WIDTH } from '@/modules/island/constants/island';

interface IslandSilhouetteProps {
  fillRef    : RefObject<SVGPathElement | null>;
  outlineRef : RefObject<SVGPathElement | null>;
}

// Background and border of the island; GSAP draws both paths for the island's edge and sets their colors
// (React never sets them, so a new render cannot undo an animation).
export const IslandSilhouette = ({ fillRef, outlineRef }: IslandSilhouetteProps) => (
  <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
    <path ref={fillRef} fill="transparent" />
    <path ref={outlineRef} fill="none" stroke="transparent" strokeWidth={OUTLINE_WIDTH} strokeLinejoin="round" />
  </svg>
);
