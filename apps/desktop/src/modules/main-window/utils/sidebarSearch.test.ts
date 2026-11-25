import { describe, expect, it } from 'vitest';
import { searchSidebar, stepIndex } from '@/modules/main-window/utils/sidebarSearch';
import { TOOLS } from '@/modules/tools/constants/tools';

const ids = (query: string): string[] => searchSidebar(query, TOOLS).map((result) => result.id);

describe('the side bar search', () => {
  it('with nothing typed offers all the tools', () => {
    expect(ids('')).toEqual(['all-tools']);
    expect(ids('   ')).toEqual(['all-tools']);
  });

  it('finds families, tools and settings, in that order, and always ends with all the tools', () => {
    expect(ids('pdf')[0]).toBe('family-pdf');
    expect(ids('pdf')).toContain('tool-merge-pdf');
    expect(ids('portapapeles')).toEqual(['family-clipboard', 'tool-clipboard', 'setting-clipboard', 'all-tools']);
    expect(ids('borde')).toEqual(['setting-position', 'setting-border', 'all-tools']);
  });

  it('does not care about accents or capitals, and needs every word', () => {
    expect(ids('IMAGENES')).toContain('family-images');
    expect(ids('quitar fondo')).toEqual(['tool-remove-background', 'all-tools']);
    expect(ids('traducir')).toEqual(['all-tools']);
  });

  it('keeps the list short', () => {
    expect(searchSidebar('pdf', TOOLS).filter((result) => result.kind === 'tool')).toHaveLength(6);
  });

  it('goes up and down around the ends', () => {
    expect(stepIndex(-1, 1, 3)).toBe(0);
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(0, -1, 3)).toBe(2);
    expect(stepIndex(0, 1, 0)).toBe(-1);
  });
});
