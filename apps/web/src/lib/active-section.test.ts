import { describe, expect, it } from 'vitest';
import { activeSection } from '@/lib/active-section';

const page = [
  { id: 'inicio', top: -900 },
  { id: 'que-hace', top: -100 },
  { id: 'como-funciona', top: 500 },
  { id: 'privacidad', top: 1400 },
] as const;

describe('activeSection', () => {
  it('is the last section whose top passed the line', () => {
    expect(activeSection([...page], 300)).toBe('que-hace');
    expect(activeSection([...page], 500)).toBe('como-funciona');
  });

  it('is the first one before any passed, and none without sections', () => {
    expect(activeSection([{ id: 'inicio', top: 40 }, { id: 'que-hace', top: 900 }], 10)).toBe('inicio');
    expect(activeSection([], 300)).toBeNull();
  });
});
