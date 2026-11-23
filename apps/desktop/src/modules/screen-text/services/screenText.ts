import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { CAPTURE_WINDOW_PREFIX } from '@/modules/screen-text/constants/screenText';
import type { Zone } from '@/modules/screen-text/interfaces/zone';
import {
  CANCEL_SCREEN_TEXT,
  CAPTURE_READY,
  COPY_SCREEN_TEXT,
  GET_CAPTURE_IMAGE,
  READ_SCREEN_TEXT,
  START_SCREEN_TEXT,
} from '@/shared/constants/events';

// The same page runs in the island and in each overlay; the window's label tells them apart.
export const isCaptureWindow = (): boolean => getCurrentWindow().label.startsWith(CAPTURE_WINDOW_PREFIX);

// Rust hides the island, takes the still and opens one overlay per monitor.
export const startScreenText = (): Promise<void> => invoke(START_SCREEN_TEXT);

// The still of this overlay's monitor, as PNG bytes kept in memory.
export const getCaptureImage = (): Promise<ArrayBuffer> => invoke<ArrayBuffer>(GET_CAPTURE_IMAGE);

export const captureReady = (): Promise<void> => invoke(CAPTURE_READY);

// The zone in pixels of the still; Rust closes the overlays, reads it and copies its text.
export const readScreenText = (zone: Zone): Promise<void> => invoke(READ_SCREEN_TEXT, { request: { zone } });

export const cancelScreenText = (): Promise<void> => invoke(CANCEL_SCREEN_TEXT);

// "Copiar de nuevo" in the history: Rust writes the clipboard, as with the capture.
export const copyScreenText = (text: string): Promise<void> => invoke(COPY_SCREEN_TEXT, { text });
