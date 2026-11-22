import { invoke } from '@tauri-apps/api/core';
import { OPEN_MAIN_WINDOW } from '@/shared/constants/events';

export const openMainWindow = async (): Promise<void> => {
  await invoke(OPEN_MAIN_WINDOW);
};
