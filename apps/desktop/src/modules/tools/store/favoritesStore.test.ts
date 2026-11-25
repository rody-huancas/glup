import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings, SettingsView } from '@/modules/settings/interfaces/appSettings';
import { DEFAULT_SETTINGS } from '@/modules/settings/constants/saveLocation';

// settings.json, in memory: what the store writes is what it reads back.
let saved: SettingsView = { ...DEFAULT_SETTINGS, favoriteTools: ['merge-pdf'] };

vi.mock('@/modules/settings/services/settings', () => ({
  getSettings    : vi.fn(() => Promise.resolve(saved)),
  changeSettings : vi.fn((change: (view: SettingsView) => AppSettings) => {
    saved = { ...saved, ...change(saved) };
    return Promise.resolve(saved);
  }),
}));

const store = await import('@/modules/tools/store/favoritesStore');

describe('the favorites store', () => {
  beforeEach(async () => {
    saved = { ...DEFAULT_SETTINGS, favoriteTools: ['merge-pdf'] };
    await store.reloadFavorites();
  });

  it('loads what settings.json has', () => {
    expect(store.getFavorites()).toEqual(['merge-pdf']);
  });

  it('adds, moves and removes, and every change is saved', async () => {
    await store.toggleFavoriteTool('remove-background');
    await store.toggleFavoriteTool('transcribe');
    expect(saved.favoriteTools).toEqual(['merge-pdf', 'remove-background', 'transcribe']);

    await store.moveFavoriteTool(2, 0);
    expect(saved.favoriteTools).toEqual(['transcribe', 'merge-pdf', 'remove-background']);

    await store.removeFavoriteTool('merge-pdf');
    expect(saved.favoriteTools).toEqual(['transcribe', 'remove-background']);

    // Read again from settings.json: the same list.
    await store.reloadFavorites();
    expect(store.getFavorites()).toEqual(['transcribe', 'remove-background']);
  });
});
