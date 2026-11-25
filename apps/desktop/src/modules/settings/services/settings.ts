import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { SAVE_TEXTS } from '@/modules/settings/constants/saveLocation';
import type { AppSettings, SettingsView } from '@/modules/settings/interfaces/appSettings';
import { GET_SETTINGS, UPDATE_SETTINGS } from '@/shared/constants/events';

// Stored by Rust in settings.json inside the app data folder.
export const getSettings = (): Promise<SettingsView> => invoke<SettingsView>(GET_SETTINGS);

export const updateSettings = (settings: AppSettings): Promise<SettingsView> =>
  invoke<SettingsView>(UPDATE_SETTINGS, { settings });

// Reads the settings as they are now and writes them back with one change (favorites, the border…), so
// two screens changing different things never undo each other.
export const changeSettings = (change: (view: SettingsView) => AppSettings): Promise<SettingsView> =>
  getSettings().then((view) => updateSettings(change(view)));

export const pickFolder = async (current: string | null): Promise<string | null> => {
  const result = await open({ directory: true, multiple: false, title: SAVE_TEXTS.pickTitle, defaultPath: current ?? undefined });
  return typeof result === 'string' ? result : null;
};
