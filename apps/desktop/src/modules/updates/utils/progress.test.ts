import { describe, expect, it } from 'vitest';
import { isDownloaded, progressDetail, progressValue } from '@/modules/updates/utils/progress';

describe('update progress', () => {
  it('is indeterminate until the size is known', () => {
    expect(progressValue(null)).toBeNull();
    expect(progressValue({ downloaded: 10, total: null })).toBeNull();
    expect(progressValue({ downloaded: 10, total: 0 })).toBeNull();
  });

  it('goes from 0 to 1 and never past it', () => {
    expect(progressValue({ downloaded: 25, total: 100 })).toBe(0.25);
    expect(progressValue({ downloaded: 120, total: 100 })).toBe(1);
  });

  it('says how much arrived out of the total', () => {
    expect(progressDetail({ downloaded: 3 * 1024 * 1024, total: 12 * 1024 * 1024 })).toBe('3 MB de 12 MB');
    expect(progressDetail(null)).toBeNull();
  });

  it('knows when the installer takes over', () => {
    expect(isDownloaded({ downloaded: 99, total: 100 })).toBe(false);
    expect(isDownloaded({ downloaded: 100, total: 100 })).toBe(true);
    expect(isDownloaded({ downloaded: 100, total: null })).toBe(false);
  });
});
