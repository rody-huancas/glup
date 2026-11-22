import { useState } from 'react';
import type { UIEvent } from 'react';
import { ITEM_ROW_HEIGHT, ITEMS_MAX_HEIGHT, ITEMS_OVERSCAN } from '@/modules/cleanup/constants/categories';
import { visibleRange } from '@/modules/cleanup/utils/virtualRange';

// Only the rows in view (plus a few) are rendered, so thousands of cache files scroll smoothly.
export const useVirtualRows = (count: number) => {
  const [scrollTop, setScrollTop] = useState(0);
  const height                    = Math.min(ITEMS_MAX_HEIGHT, count * ITEM_ROW_HEIGHT);
  const range                     = visibleRange({ scrollTop, viewport: height, rowHeight: ITEM_ROW_HEIGHT, count, overscan: ITEMS_OVERSCAN });

  return {
    range,
    height,
    total    : count * ITEM_ROW_HEIGHT,
    onScroll : (event: UIEvent<HTMLDivElement>) => setScrollTop(event.currentTarget.scrollTop),
  };
};
