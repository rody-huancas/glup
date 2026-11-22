import type { RefObject } from 'react';
import { getIslandLayout } from '@/modules/island/utils/islandLayout';
import { getDropZoneStyle } from '@/modules/island/utils/islandStyles';

interface IslandDropZoneProps {
  zoneRef : RefObject<HTMLDivElement | null>;
  message : string;
}

const INITIAL_LAYOUT = getIslandLayout({ target: 'collapsed', actionsHeight: 0 });

export const IslandDropZone = ({ zoneRef, message }: IslandDropZoneProps) => (
  <div
    ref={zoneRef}
    className="pointer-events-none absolute flex items-center justify-center rounded-control border-2 border-dashed border-line-dashed px-4 text-center text-sm font-medium text-muted"
    style={getDropZoneStyle(INITIAL_LAYOUT)}
  >
    {message}
  </div>
);
