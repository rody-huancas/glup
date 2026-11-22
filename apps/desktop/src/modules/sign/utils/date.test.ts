import { describe, expect, it } from 'vitest';
import { formatDate } from '@/modules/sign/utils/date';

describe('formatDate', () => {
  it('writes dd/mm/aaaa', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('05/01/2026');
    expect(formatDate(new Date(2026, 10, 22))).toBe('22/11/2026');
  });
});
