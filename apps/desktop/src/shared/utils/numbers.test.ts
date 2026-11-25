import { describe, expect, it } from 'vitest';
import { formatCount, formatDecimal } from '@/shared/utils/numbers';

describe('numbers', () => {
  it('read as in Spanish: a point between thousands, a comma for decimals', () => {
    expect(formatCount(29684)).toBe('29.684');
    expect(formatCount(1234)).toBe('1.234');
    expect(formatCount(1665409)).toBe('1.665.409');
    expect(formatCount(12)).toBe('12');
    expect(formatDecimal(36.14, 1)).toBe('36,1');
    expect(formatDecimal(1.5, 2)).toBe('1,5');
  });
});
