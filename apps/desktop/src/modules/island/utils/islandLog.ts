import { invoke } from '@tauri-apps/api/core';
import { LOG_ISLAND } from '@/shared/constants/events';

// Dev only: the line goes to the webview console and to the terminal running tauri dev.
const log = (tag: string, line: string) => {
  if (!import.meta.env.DEV) return;

  console.debug(`[glup:${tag}] ${line}`);
  void invoke(LOG_ISLAND, { line, tag }).catch(() => undefined);
};

export const logIsland = (line: string) => log('isla', line);

// The bubble's clicks, focus and blur, to tell a lost click from one that arrived.
export const logBubble = (line: string) => log('burbuja', line);

// Ajustes › Posición: what moves while the slider or the marker is held (settings, window, region, phase).
export const logPosition = (line: string) => log('posicion', line);
