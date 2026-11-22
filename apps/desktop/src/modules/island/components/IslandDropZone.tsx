import type { RefObject } from 'react';
import { getDropZoneStyle } from '@/modules/island/utils/islandStyles';

interface IslandDropZoneProps {
  zoneRef: RefObject<HTMLDivElement | null>;
}

export const IslandDropZone = ({ zoneRef }: IslandDropZoneProps) => (
  <div
    ref={zoneRef}
    className="pointer-events-none absolute flex items-center justify-center rounded-2xl border-2 border-dashed border-white/20 px-4 text-center text-sm font-medium text-white/70"
    style={getDropZoneStyle('collapsed')}
  >
    Suelta un archivo aquí
  </div>
);
