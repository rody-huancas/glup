import { createRef } from 'react';
import type { IslandElements } from '@/modules/island/interfaces/islandElements';

export const createIslandElements = (): IslandElements => ({
  panel        : createRef(),
  // peek         : createRef(),
  fill         : createRef(),
  outline      : createRef(),
  content      : createRef(),
  lift         : createRef(),
  flyer        : createRef(),
  squash       : createRef(),
  pillAnchor   : createRef(),
  noticeAnchor : createRef(),
  noticeText   : createRef(),
  avatarAnchor : createRef(),
});
