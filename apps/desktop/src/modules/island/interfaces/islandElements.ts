import type { RefObject } from 'react';

export interface IslandElements {
  panel        : RefObject<HTMLDivElement | null>;
  // peek         : RefObject<HTMLDivElement | null>;
  fill         : RefObject<SVGPathElement | null>;
  outline      : RefObject<SVGPathElement | null>;
  content      : RefObject<HTMLDivElement | null>;
  lift         : RefObject<HTMLDivElement | null>;
  flyer        : RefObject<HTMLDivElement | null>;
  squash       : RefObject<HTMLDivElement | null>;
  pillAnchor   : RefObject<HTMLDivElement | null>;
  avatarAnchor : RefObject<HTMLDivElement | null>;
}
