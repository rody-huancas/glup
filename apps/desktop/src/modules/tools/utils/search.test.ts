import { describe, expect, it } from 'vitest';
import { ACTIONS } from '@/modules/actions/constants/actions';
import { QUICK_TOOLS, TOOL_SECTIONS, TOOLS } from '@/modules/tools/constants/tools';
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
    expect(titles('peso')).toEqual(['compress-pdf', 'compress-image']);
  });

  it('finds nothing for what Glup cannot do', () => {
    expect(titles('traducir')).toEqual([]);
  });
});

describe('groupTools', () => {
  it('keeps the section order and drops empty sections', () => {
    const groups = groupTools({ tools: filterTools(TOOLS, 'peso'), sections: TOOL_SECTIONS });
    expect(groups.map((group) => group.section)).toEqual(['pdf', 'images']);
  });

  it('shows the four sections with everything', () => {
    const groups = groupTools({ tools: TOOLS, sections: TOOL_SECTIONS });
    expect(groups.map((group) => group.section)).toEqual(['pdf', 'images', 'files', 'pc']);
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

  it('marks the quick tools for Inicio', () => {
    expect(QUICK_TOOLS.map((tool) => tool.id)).toEqual([
      'merge-pdf', 'split-pdf', 'compress-pdf', 'sign-pdf', 'pdf-to-images', 'convert-image', 'compress-image', 'remove-background',
    ]);
  });
});
