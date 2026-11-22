import { createRef } from 'react';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';

export const createIslandElements = (): IslandElements => ({
  panel    : createRef(),
  mascot   : createRef(),
  dropZone : createRef(),
});
