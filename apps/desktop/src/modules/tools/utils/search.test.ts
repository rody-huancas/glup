import { describe, expect, it } from 'vitest';
import { ACTIONS } from '@/modules/actions/constants/actions';
import { FAMILY_IDS } from '@/modules/families/constants/families';
import { TOOLS } from '@/modules/tools/constants/tools';
import { filterTools, groupTools, normalizeText } from '@/modules/tools/utils/search';

const titles = (query: string): string[] => filterTools(TOOLS, query).map((tool) => tool.id);

describe('normalizeText', () => {
  it('drops accents and capitals', () => {
    expect(normalizeText('  Imágenes Ñandú ')).toBe('imagenes nandu');
  });
});

describe('filterTools', () => {
  it('returns every tool for an empty query', () => {
    expect(filterTools(TOOLS, '   ')).toHaveLength(TOOLS.length);
  });

  it('matches the name without caring about accents or capitals', () => {
    expect(titles('IMAGENES')).toContain('pdf-to-images');
    expect(titles('quitar FONDO')).toEqual(['remove-background']);
  });

  it('matches the description too', () => {
    expect(titles('firma')).toEqual(['sign-pdf']);
    expect(titles('espacio')).toEqual(['cleanup']);
  });

  it('needs every word, in any order', () => {
    expect(titles('peso foto')).toEqual(['compress-image']);
    expect(titles('peso')).toEqual(['compress-pdf', 'compress-image', 'compress-video']);
  });

  it('finds nothing for what Glup cannot do', () => {
    expect(titles('traducir')).toEqual([]);
  });
});

describe('groupTools', () => {
  it('keeps the family order and drops empty families', () => {
    const groups = groupTools({ tools: filterTools(TOOLS, 'peso foto'), families: FAMILY_IDS });
    expect(groups.map((group) => group.family)).toEqual(['images']);
    expect(groupTools({ tools: filterTools(TOOLS, 'peso'), families: FAMILY_IDS }).map((group) => group.family)).toEqual(['images', 'pdf', 'media']);
  });

  it('shows the six families with everything', () => {
    const groups = groupTools({ tools: TOOLS, families: FAMILY_IDS });
    expect(groups.map((group) => group.family)).toEqual(['images', 'pdf', 'media', 'text', 'clipboard', 'pc']);
  });
});

describe('tools.json', () => {
  it('has unique ids', () => {
    expect(new Set(TOOLS.map((tool) => tool.id)).size).toBe(TOOLS.length);
  });

  it('only points at actions that exist in actions.json', () => {
    const actionIds = new Set(ACTIONS.map((action) => action.id));
    TOOLS.forEach((tool) => {
      if (tool.kind === 'action') expect(actionIds).toContain(tool.actionId);
    });
  });
});
