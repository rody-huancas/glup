import { describe, expect, it } from 'vitest';
import { countReasons, visibleFiles } from '@/modules/folder-sort/utils/sortView';

describe('countReasons', () => {
  it('counts what is left for each reason, in a fixed order and without the empty ones', () => {
    const counts = countReasons([
      { name: 'a.pdf', reason: 'recent' },
      { name: 'b.mp4.crdownload', reason: 'downloading' },
      { name: 'c.docx', reason: 'in-use' },
      { name: 'd.zip.part', reason: 'downloading' },
    ]);

    expect(counts.map(({ reason, count }) => [reason, count])).toEqual([['downloading', 2], ['in-use', 1], ['recent', 1]]);
    expect(counts[0].label).toBe('Se está descargando');
    expect(countReasons([])).toEqual([]);
  });
});

describe('visibleFiles', () => {
  it('shows the first ones of a long group and counts the rest', () => {
    const files = Array.from({ length: 65 }, (_, index) => index);

    expect(visibleFiles(files, 60).shown).toHaveLength(60);
    expect(visibleFiles(files, 60).hidden).toBe(5);
    expect(visibleFiles([1, 2], 60)).toEqual({ shown: [1, 2], hidden: 0 });
  });
});
