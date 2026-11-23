import { invoke } from '@tauri-apps/api/core';
import type { ShortcutView } from '@/modules/shortcuts/interfaces/shortcutView';
import type { ShortcutTarget } from '@/modules/shortcuts/types/shortcutTarget';
import { GET_SHORTCUT, PAUSE_SHORTCUTS, SET_SHORTCUT } from '@/shared/constants/events';

export const getShortcut = (target: ShortcutTarget): Promise<ShortcutView> => invoke<ShortcutView>(GET_SHORTCUT, { target });

interface SetShortcutParams {
  target   : ShortcutTarget;
  // null keeps the one chosen before (to turn it on or off).
  shortcut : string | null;
  enabled  : boolean;
}

export const setShortcut = (request: SetShortcutParams): Promise<ShortcutView> => invoke<ShortcutView>(SET_SHORTCUT, { request });

// While Ajustes listens for a new combination, none of Glup's shortcuts fires.
export const pauseShortcuts = (paused: boolean): Promise<void> => invoke(PAUSE_SHORTCUTS, { paused });
