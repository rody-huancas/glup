import type { RefObject } from 'react';

export interface IslandElements {
  panel    : RefObject<HTMLDivElement | null>;
  mascot   : RefObject<HTMLDivElement | null>;
  dropZone : RefObject<HTMLDivElement | null>;
  actions  : RefObject<HTMLDivElement | null>;
}
