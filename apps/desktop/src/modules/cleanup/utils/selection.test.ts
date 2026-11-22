import { describe, expect, it } from 'vitest';
import { RECYCLE_BIN_KEY } from '@/modules/cleanup/constants/categories';
import type { CleanupCategory } from '@/modules/cleanup/interfaces/cleanupCategory';
import {
  canMark,
  categoryState,
  defaultSelection,
  selectedPaths,
  selectionTotals,
  toggleCategory,
  toggleItem,
} from '@/modules/cleanup/utils/selection';

const item = (path: string, size: number, group: number | null = null) => ({ path, size, modified: 0, group });

const temp: CleanupCategory = { id: 'temp', method: 'direct', items: [item('a.tmp', 10), item('b.tmp', 20)], total: 30, count: 2, running: [] };
const bin: CleanupCategory  = { id: 'recycle-bin', method: 'empty-recycle-bin', items: [], total: 500, count: 3, running: [] };

// Oldest copy first in each group.
const duplicates: CleanupCategory = {
  id      : 'duplicates',
  method  : 'trash',
  items   : [item('vieja.jpg', 100, 0), item('copia.jpg', 100, 0), item('otra.jpg', 100, 0), item('x.pdf', 50, 1), item('x (2).pdf', 50, 1)],
  total   : 250,
  count   : 5,
  running : [],
};

describe('cleanup selection', () => {
  it('marks only temporary files and caches by default', () => {
    expect([...defaultSelection([temp, bin, duplicates])]).toEqual(['a.tmp', 'b.tmp']);
  });

  it('marks a group but keeps its oldest copy', () => {
    const marked = toggleCategory(duplicates, new Set());

    expect([...marked].sort()).toEqual(['copia.jpg', 'otra.jpg', 'x (2).pdf']);
    expect(categoryState(duplicates, marked)).toBe('all');
    expect(categoryState(duplicates, toggleCategory(duplicates, marked))).toBe('none');
  });

  it('never lets every copy be marked', () => {
    const marked = toggleCategory(duplicates, new Set());

    expect(canMark({ category: duplicates, path: 'vieja.jpg', selected: marked })).toBe(false);
    expect(toggleItem({ category: duplicates, path: 'vieja.jpg', selected: marked }).has('vieja.jpg')).toBe(false);

    const swapped = toggleItem({ category: duplicates, path: 'vieja.jpg', selected: toggleItem({ category: duplicates, path: 'copia.jpg', selected: marked }) });
    expect(swapped.has('vieja.jpg') && !swapped.has('copia.jpg')).toBe(true);
  });

  it('adds up what is marked, split by how it goes away', () => {
    const marked = new Set(['a.tmp', 'copia.jpg', RECYCLE_BIN_KEY]);

    expect(selectionTotals([temp, bin, duplicates], marked)).toEqual({ trash: 100, direct: 10, bin: 500, total: 610, files: 2 });
    expect(selectedPaths([temp, bin, duplicates], marked)).toEqual(['a.tmp', 'copia.jpg']);
  });

  it('empties the recycle bin as a whole', () => {
    expect(categoryState(bin, toggleCategory(bin, new Set()))).toBe('all');
    expect(toggleCategory({ ...bin, total: 0 }, new Set()).size).toBe(0);
  });
});
