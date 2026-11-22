import { invoke } from '@tauri-apps/api/core';
import { MISSING_FILE, OPEN_FILE, REVEAL_FILE } from '@/shared/constants/events';

// Resolves false when the file no longer exists.
const callWithPath = async (command: string, path: string): Promise<boolean> => {
  try {
    await invoke(command, { path });
    return true;
  } catch (error) {
    if (error === MISSING_FILE) return false;
    throw error;
  }
};

export const openFile = (path: string): Promise<boolean> => callWithPath(OPEN_FILE, path);

export const revealFile = (path: string): Promise<boolean> => callWithPath(REVEAL_FILE, path);
