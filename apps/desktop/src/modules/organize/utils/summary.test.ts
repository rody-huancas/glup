import { describe, expect, it } from 'vitest';
import { summaryLine } from '@/modules/organize/utils/summary';

describe('summaryLine', () => {
  it('says only what changed, with plurals', () => {
    expect(summaryLine({ kept: 12, removed: 2, rotated: 3 })).toBe('12 páginas · 2 quitadas · 3 giradas');
    expect(summaryLine({ kept: 1, removed: 1, rotated: 0 })).toBe('1 página · 1 quitada');
    expect(summaryLine({ kept: 5, removed: 0, rotated: 1 })).toBe('5 páginas · 1 girada');
    expect(summaryLine({ kept: 5, removed: 0, rotated: 0 })).toBe('5 páginas');
  });
});
