import { describe, expect, it } from 'vitest';
import { parseTargetMb } from '@/modules/pdf/utils/targetSize';

describe('parseTargetMb', () => {
  it('reads commas and dots', () => {
    expect(parseTargetMb('2,5')).toBe(2_621_440);
    expect(parseTargetMb(' 1.5 ')).toBe(1_572_864);
  });

  it('treats empty as no limit', () => {
    expect(parseTargetMb('')).toBeNull();
  });

  it('rejects zero, negatives and text', () => {
    expect(parseTargetMb('0')).toBeUndefined();
    expect(parseTargetMb('-2')).toBeUndefined();
    expect(parseTargetMb('abc')).toBeUndefined();
  });
});
