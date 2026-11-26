import { describe, expect, it } from 'vitest';
import { POPULAR_TOOLS } from '@/modules/home/constants/dashboard';
import { fillShortcuts, toolsById } from '@/modules/home/utils/shortcuts';
import { TOOLS } from '@/modules/tools/constants/tools';

const ids = (list: { id: string }[]) => list.map((tool) => tool.id);
const of  = (names: string[]) => toolsById(names, TOOLS);
const popular = of(POPULAR_TOOLS);

describe('the shortcuts of Inicio', () => {
  it('without a history are the four popular ones', () => {
    expect(ids(popular)).toEqual(['compress-image', 'convert-image', 'transcribe', 'merge-pdf']);
    expect(ids(fillShortcuts({ favorites: [], used: [], popular, limit: 4 }))).toEqual(POPULAR_TOOLS);
  });

  it('are the favorites, filled with the most used and then the popular ones, never twice', () => {
    const favorites = of(['sign-pdf', 'cleanup']);
    const used      = of(['cleanup', 'split-pdf']);
    expect(ids(fillShortcuts({ favorites, used, popular, limit: 4 }))).toEqual(['sign-pdf', 'cleanup', 'split-pdf', 'compress-image']);
    expect(ids(fillShortcuts({ favorites: of(['a', 'sign-pdf', 'qr-read', 'space', 'cleanup']), used, popular, limit: 4 }))).toEqual(['sign-pdf', 'qr-read', 'space', 'cleanup']);
  });
});
