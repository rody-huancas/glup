import { describe, expect, it } from 'vitest';
import { anchorTarget } from '@/lib/anchors';

describe('anchorTarget', () => {
  it('sends the start and the first section to the top', () => {
    expect(anchorTarget('#', 'inicio')).toBe('top');
    expect(anchorTarget('#inicio', 'inicio')).toBe('top');
  });

  it('gives the id of any other section, and nothing for other links', () => {
    expect(anchorTarget('#preguntas', 'inicio')).toBe('preguntas');
    expect(anchorTarget('#c%C3%B3mo', 'inicio')).toBe('cómo');
    expect(anchorTarget('https://github.com/rody-huancas/glup', 'inicio')).toBeNull();
  });
});
