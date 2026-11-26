import { describe, expect, it } from 'vitest';
import { topStats } from '@/modules/home/utils/weekStats';

const stats = (files: number, savedBytes: number, audioSeconds: number, screenTexts: number) => ({ files, savedBytes, audioSeconds, screenTexts });

describe('the numbers of the week', () => {
  it('are the two most important that are not zero', () => {
    expect(topStats(stats(12, 5000, 300, 2), 2).map((stat) => stat.kind)).toEqual(['files', 'saved']);
    expect(topStats(stats(0, 5000, 0, 2), 2)).toEqual([{ kind: 'saved', value: 5000 }, { kind: 'screenTexts', value: 2 }]);
    expect(topStats(stats(0, 0, 90, 0), 2)).toEqual([{ kind: 'audio', value: 90 }]);
    expect(topStats(stats(0, 0, 0, 0), 2)).toEqual([]);
  });
});
