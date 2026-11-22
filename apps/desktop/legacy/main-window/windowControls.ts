import { getCurrentWindow } from '@tauri-apps/api/window';

export const minimizeWindow = (): void => {
  void getCurrentWindow().minimize();
};

// Closing only hides the window; the app keeps running in the island.
export const hideWindow = (): void => {
  void getCurrentWindow().hide();
};
