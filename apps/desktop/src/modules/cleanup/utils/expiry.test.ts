import { describe, expect, it } from 'vitest';
import { RESULT_LIFETIME_MS } from '@/modules/cleanup/constants/categories';
import { isExpired } from '@/modules/cleanup/utils/expiry';

describe('isExpired', () => {
  it('drops results older than 30 minutes', () => {
    expect(isExpired(0, RESULT_LIFETIME_MS)).toBe(false);
    expect(isExpired(0, RESULT_LIFETIME_MS + 1)).toBe(true);
    expect(isExpired(null, Number.MAX_SAFE_INTEGER)).toBe(false);
  });
});
