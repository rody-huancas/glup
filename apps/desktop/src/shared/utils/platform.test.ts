import { describe, expect, it } from 'vitest';
import { isWindows } from '@/shared/utils/platform';

describe('isWindows', () => {
  it('reads the system from the webview', () => {
    expect(isWindows('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/131.0')).toBe(true);
    expect(isWindows('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15')).toBe(false);
    expect(isWindows('')).toBe(false);
  });
});
