import { describe, expect, it } from 'vitest';
import { LINKS } from '@/config/links';
import { isExternal, newTabAttributes } from '@/lib/links';

describe('isExternal', () => {
  it('is true for pages of other sites', () => {
    expect(isExternal(LINKS.repository)).toBe(true);
    expect(isExternal(LINKS.releases)).toBe(true);
    expect(isExternal(LINKS.license)).toBe(true);
  });

  it('is false for the installer and for the page itself', () => {
    expect(isExternal(LINKS.download)).toBe(false);
    expect(isExternal('#descargar')).toBe(false);
  });
});

describe('newTabAttributes', () => {
  it('opens other sites in a new tab, safely', () => {
    expect(newTabAttributes(LINKS.repository)).toEqual({ target: '_blank', rel: 'noopener noreferrer' });
    expect(newTabAttributes(LINKS.download)).toEqual({});
  });
});
