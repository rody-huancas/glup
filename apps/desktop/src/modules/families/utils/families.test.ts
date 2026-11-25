import { describe, expect, it } from 'vitest';
import { FAMILY_IDS } from '@/modules/families/constants/families';
import { familyOfPage, familyOfTask, familyPage, toolsOf, wholeGigabytes } from '@/modules/families/utils/families';
import { TOOLS } from '@/modules/tools/constants/tools';

describe('families', () => {
  it('gives every tool a family, and every family something to do', () => {
    TOOLS.forEach((tool) => expect(FAMILY_IDS).toContain(tool.family));
    FAMILY_IDS.forEach((family) => expect(toolsOf(TOOLS, family).length).toBeGreaterThan(0));
  });

  it('puts the PC tools and the clipboard where they belong', () => {
    expect(toolsOf(TOOLS, 'pc').map((tool) => tool.id)).toEqual(['zip-files', 'cleanup', 'folder-sort', 'duplicates', 'performance']);
    expect(toolsOf(TOOLS, 'clipboard').map((tool) => tool.id)).toEqual(['clipboard']);
    expect(toolsOf(TOOLS, 'text').map((tool) => tool.id)).toContain('extract-text');
  });

  it('goes from a family to its screen and back', () => {
    expect(familyPage('media')).toBe('family-media');
    expect(familyOfPage('family-pdf')).toBe('pdf');
    expect(familyOfPage('tools')).toBeNull();
  });

  it('colors a task with the family of its tool', () => {
    expect(familyOfTask({ actionId: 'compress', type: 'pdf', owner: 'home' }, TOOLS)).toBe('pdf');
    expect(familyOfTask({ actionId: 'compress', type: 'image', owner: 'home' }, TOOLS)).toBe('images');
    expect(familyOfTask({ actionId: 'compress', type: 'video', owner: 'home' }, TOOLS)).toBe('media');
    expect(familyOfTask({ actionId: 'transcribe', type: 'audio', owner: 'home' }, TOOLS)).toBe('media');
    expect(familyOfTask({ actionId: 'extract-text', type: 'image', owner: 'home' }, TOOLS)).toBe('text');
    expect(familyOfTask({ actionId: 'merge', type: 'pdf-mixed', owner: 'home' }, TOOLS)).toBe('pdf');
    expect(familyOfTask({ actionId: 'zip', type: 'mixed', owner: 'home' }, TOOLS)).toBe('pc');
    expect(familyOfTask({ actionId: null, type: null, owner: 'cleanup' }, TOOLS)).toBe('pc');
    expect(familyOfTask({ actionId: null, type: null, owner: 'home' }, TOOLS)).toBeNull();
  });

  it('rounds the free space to whole gigabytes', () => {
    expect(wholeGigabytes(98.4 * 1024 ** 3)).toBe(98);
    expect(wholeGigabytes(0)).toBe(0);
  });
});
