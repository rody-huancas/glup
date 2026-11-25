import { describe, expect, it } from 'vitest';
import { backTarget } from '@/modules/main-window/utils/backTarget';

describe('the way back', () => {
  it('goes from a family to Habilidades and from a tool to its family', () => {
    expect(backTarget('family-pdf')).toBe('tools');
    expect(backTarget('family-pc')).toBe('tools');
    expect(backTarget('cleanup')).toBe('family-pc');
    expect(backTarget('performance')).toBe('family-pc');
    expect(backTarget('clipboard')).toBe('family-clipboard');
  });

  it('has none from the screens of the bar', () => {
    expect(backTarget('home')).toBeNull();
    expect(backTarget('tools')).toBeNull();
    expect(backTarget('history')).toBeNull();
    expect(backTarget('settings')).toBeNull();
  });
});
