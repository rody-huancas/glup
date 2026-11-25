import type { RefObject } from 'react';
import { HOVER_GLOW, OUTLINE_WIDTH } from '@/modules/island/constants/island';
import { ISLAND_EDGE_VARIABLE } from '@/modules/island/constants/border';

interface IslandSilhouetteProps {
  fillRef    : RefObject<SVGPathElement | null>;
  outlineRef : RefObject<SVGPathElement | null>;
  glowRef    : RefObject<SVGPathElement | null>;
}

const EDGE_GRADIENT = 'island-edge';
const GLOW_FILTER   = 'island-glow';

// Background, glow and edge of the island; GSAP draws the paths for the island's edge and sets the fill
// (React never sets it, so a new render cannot undo an animation). The edge is a thin light line, a little
// brighter on top, as the edge of glass; the glow (mint, under the cursor) shows only inside the shape.
export const IslandSilhouette = ({ fillRef, outlineRef, glowRef }: IslandSilhouetteProps) => (
  <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
    <defs>
      <linearGradient id={EDGE_GRADIENT} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: `var(${ISLAND_EDGE_VARIABLE})` }} />
        <stop offset="1" style={{ stopColor: `var(${ISLAND_EDGE_VARIABLE})`, stopOpacity: 0.55 }} />
      </linearGradient>
      <filter id={GLOW_FILTER} x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation={HOVER_GLOW.blur} />
      </filter>
    </defs>
    <path ref={fillRef} fill="transparent" />
    <path ref={glowRef} fill="none" stroke="var(--color-mint)" strokeWidth={HOVER_GLOW.width} strokeLinejoin="round" filter={`url(#${GLOW_FILTER})`} opacity={0} />
    <path ref={outlineRef} fill="none" stroke={`url(#${EDGE_GRADIENT})`} strokeWidth={OUTLINE_WIDTH} strokeLinejoin="round" />
  </svg>
);
