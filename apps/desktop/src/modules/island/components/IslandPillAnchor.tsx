import type { RefObject } from 'react';
import type { IslandPlacement } from '@/modules/dock/interfaces/islandPlacement';
import { getPillAnchorStyle } from '@/modules/island/utils/islandStyles';

interface IslandPillAnchorProps {
  anchorRef : RefObject<HTMLDivElement | null>;
  placement : IslandPlacement;
}

// Invisible box marking where Glup rests in the pill.
export const IslandPillAnchor = ({ anchorRef, placement }: IslandPillAnchorProps) => (
  <div ref={anchorRef} aria-hidden className="pointer-events-none invisible absolute" style={getPillAnchorStyle(placement)} />
);
