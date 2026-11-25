import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { MARK_TEXTS } from '@/modules/photo-mark/constants/texts';
import type { MarkOptions } from '@/modules/photo-mark/interfaces/markOptions';
import { GET_MARK_CONFIG, SAVE_MARK_CONFIG } from '@/shared/constants/events';

// The last choices (marca.json, with the logo used).
export const getMarkConfig = (): Promise<MarkOptions> => invoke<MarkOptions>(GET_MARK_CONFIG);

export const saveMarkConfig = (options: MarkOptions): Promise<void> => invoke(SAVE_MARK_CONFIG, { options });

// The logo: a PNG of the person's (only read, never copied).
export const pickLogo = async (): Promise<string | null> => {
  const chosen = await open({ multiple: false, directory: false, title: MARK_TEXTS.pickTitle, filters: [{ name: MARK_TEXTS.pickFilter, extensions: ['png'] }] });
  return typeof chosen === 'string' ? chosen : null;
};
