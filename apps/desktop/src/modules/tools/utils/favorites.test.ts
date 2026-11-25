import { describe, expect, it } from 'vitest';
import { isFavorite, knownFavorites, moveFavorite, removeFavorite, toggleFavorite } from '@/modules/tools/utils/favorites';

describe('favorites', () => {
  it('adds with the star at the end and takes out with it again', () => {
    const one = toggleFavorite([], 'merge-pdf');
    const two = toggleFavorite(one, 'remove-background');
    expect(two).toEqual(['merge-pdf', 'remove-background']);
    expect(isFavorite(two, 'merge-pdf')).toBe(true);
    expect(toggleFavorite(two, 'merge-pdf')).toEqual(['remove-background']);
    expect(removeFavorite(two, 'remove-background')).toEqual(['merge-pdf']);
  });

  it('moves one to another place, and ignores places that do not exist', () => {
    const list = ['a', 'b', 'c', 'd'];
    expect(moveFavorite({ favorites: list, from: 0, to: 2 })).toEqual(['b', 'c', 'a', 'd']);
    expect(moveFavorite({ favorites: list, from: 3, to: 0 })).toEqual(['d', 'a', 'b', 'c']);
    expect(moveFavorite({ favorites: list, from: 1, to: 9 })).toBe(list);
    expect(list).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps only the tools that still exist, in the saved order', () => {
    const tools = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(knownFavorites(['c', 'gone', 'a'], tools).map((tool) => tool.id)).toEqual(['c', 'a']);
  });
});
