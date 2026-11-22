import type { RefObject } from 'react';
import { getPillAnchorStyle } from '@/modules/island/utils/islandStyles';

interface IslandPillAnchorProps {
  anchorRef: RefObject<HTMLDivElement | null>;
}

// Invisible box marking where Glup rests in the pill.
export const IslandPillAnchor = ({ anchorRef }: IslandPillAnchorProps) => (
  <div ref={anchorRef} aria-hidden className="pointer-events-none invisible absolute left-1/2" style={getPillAnchorStyle()} />
);
