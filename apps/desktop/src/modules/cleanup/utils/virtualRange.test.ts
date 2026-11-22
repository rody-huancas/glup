import { describe, expect, it } from 'vitest';
import { visibleRange } from '@/modules/cleanup/utils/virtualRange';

describe('visibleRange', () => {
  it('covers the viewport plus the overscan, inside the list', () => {
    expect(visibleRange({ scrollTop: 400, viewport: 240, rowHeight: 40, count: 1000, overscan: 2 })).toEqual({ start: 8, end: 18 });
    expect(visibleRange({ scrollTop: 0, viewport: 240, rowHeight: 40, count: 3, overscan: 6 })).toEqual({ start: 0, end: 3 });
  });
});
