import { describe, expect, it } from 'vitest';
import { shouldShowWelcome } from '@/modules/welcome/utils/welcome';

describe('shouldShowWelcome', () => {
  it('shows it on a first run started by the person', () => {
    expect(shouldShowWelcome({ welcomeSeen: false, autostart: false })).toBe(true);
  });

  it('never shows it again once answered', () => {
    expect(shouldShowWelcome({ welcomeSeen: true, autostart: false })).toBe(false);
  });

  it('stays quiet when Windows started Glup', () => {
    expect(shouldShowWelcome({ welcomeSeen: false, autostart: true })).toBe(false);
  });

  it('waits until both are known', () => {
    expect(shouldShowWelcome({ welcomeSeen: null, autostart: false })).toBe(false);
    expect(shouldShowWelcome({ welcomeSeen: false, autostart: null })).toBe(false);
  });
});
