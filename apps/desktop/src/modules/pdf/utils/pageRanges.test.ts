import { describe, expect, it } from 'vitest';
import { formatPageRanges, parsePageRanges } from '@/modules/pdf/utils/pageRanges';

describe('parsePageRanges', () => {
  it('expands ranges and single pages in the order written', () => {
    expect(parsePageRanges({ text: '1-3, 5, 8-10', total: 12 })).toEqual({ pages: [1, 2, 3, 5, 8, 9, 10], error: null });
    expect(parsePageRanges({ text: '8-9, 1', total: 12 })).toEqual({ pages: [8, 9, 1], error: null });
  });

  it('accepts spaces, semicolons and descending ranges, and drops repeats', () => {
    expect(parsePageRanges({ text: ' 3 - 1 ; 2, 3 ', total: 5 })).toEqual({ pages: [3, 2, 1], error: null });
  });

  it('rejects pages that do not exist', () => {
    expect(parsePageRanges({ text: '1-3, 14', total: 12 }).error).toBe('La página 14 no existe: el PDF tiene 12');
    expect(parsePageRanges({ text: '0', total: 12 }).error).toBe('La página 0 no existe: el PDF tiene 12');
  });

  it('rejects text it cannot read and empty input', () => {
    expect(parsePageRanges({ text: '1-, 3', total: 12 }).error).toBe('No entiendo "1-"');
    expect(parsePageRanges({ text: 'dos', total: 12 }).error).toBe('No entiendo "dos"');
    expect(parsePageRanges({ text: ' , ', total: 12 }).error).toBe('Escribe al menos una página');
  });
});

describe('formatPageRanges', () => {
  it('collapses consecutive runs and keeps the order', () => {
    expect(formatPageRanges([1, 2, 3, 5, 8, 9, 10])).toBe('1-3, 5, 8-10');
    expect(formatPageRanges([8, 9, 1])).toBe('8-9, 1');
    expect(formatPageRanges([])).toBe('');
  });

  it('round-trips with the parser', () => {
    const text = '2-4, 7, 11-12';
    expect(formatPageRanges(parsePageRanges({ text, total: 12 }).pages ?? [])).toBe(text);
  });
});
