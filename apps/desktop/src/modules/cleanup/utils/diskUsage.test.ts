import { describe, expect, it } from 'vitest';
import { isLowSpace, usedShare } from '@/modules/cleanup/utils/diskUsage';

describe('disk usage', () => {
  it('warns under 10% free', () => {
    expect(isLowSpace({ free: 42, total: 476 })).toBe(true);
    expect(isLowSpace({ free: 100, total: 476 })).toBe(false);
    expect(isLowSpace({ free: 0, total: 0 })).toBe(false);
  });

  it('measures the used share', () => {
    expect(usedShare({ free: 25, total: 100 })).toBe(0.75);
  });
});
