import type { RefObject } from 'react';
import { ISLAND_SHAPES, OUTLINE_WIDTH } from '@/modules/island/constants/islandShape';
import { buildIslandOutline, buildIslandPath } from '@/modules/island/utils/islandPath';

interface IslandSilhouetteProps {
  fillRef    : RefObject<SVGPathElement | null>;
  outlineRef : RefObject<SVGPathElement | null>;
}

const INITIAL_SHAPE = ISLAND_SHAPES.collapsed;

// Background and border of the island; GSAP redraws both paths and sets their colors.
export const IslandSilhouette = ({ fillRef, outlineRef }: IslandSilhouetteProps) => (
  <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
    <path ref={fillRef} d={buildIslandPath(INITIAL_SHAPE)} fill="transparent" />
    <path
      ref={outlineRef}
      d={buildIslandOutline(INITIAL_SHAPE)}
      fill="none"
      stroke="transparent"
      strokeWidth={OUTLINE_WIDTH}
      strokeLinejoin="round"
    />
  </svg>
);
