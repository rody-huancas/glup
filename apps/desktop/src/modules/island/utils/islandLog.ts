import { invoke } from '@tauri-apps/api/core';
import { LOG_ISLAND } from '@/shared/constants/events';

// Dev only: the line goes to the webview console and to the terminal running tauri dev.
export const logIsland = (line: string) => {
  if (!import.meta.env.DEV) return;

  console.debug(`[glup:isla] ${line}`);
  void invoke(LOG_ISLAND, { line }).catch(() => undefined);
};
