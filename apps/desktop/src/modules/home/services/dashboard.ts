import { invoke } from '@tauri-apps/api/core';
import { DOWNLOADS_TTL } from '@/modules/home/constants/dashboard';
import type { LooseFiles } from '@/modules/home/interfaces/looseFiles';
import { dismissSuggestion } from '@/modules/home/utils/suggestion';
import { changeSettings } from '@/modules/settings/services/settings';
import { GET_DOWNLOADS_TO_SORT } from '@/shared/constants/events';

let downloads: { at: number; value: Promise<LooseFiles | null> } | null = null;

// What a sort of Descargas would tidy (read on this computer; nothing moves). Kept a few minutes.
export const getDownloadsToSort = (): Promise<LooseFiles | null> => {
  if (downloads && Date.now() - downloads.at < DOWNLOADS_TTL) return downloads.value;
  downloads = { at: Date.now(), value: invoke<LooseFiles | null>(GET_DOWNLOADS_TO_SORT).catch(() => null) };
  return downloads.value;
};

// The suggestion was closed: it does not come back until what it says changes.
export const closeSuggestion = (key: string): Promise<void> =>
  changeSettings((view) => ({ ...view, dismissedTips: dismissSuggestion(view.dismissedTips, key) })).then(() => undefined);
