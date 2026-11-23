import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { PROGRAM_EXTENSIONS } from '@/modules/clipboard/constants/clipboard';
import { CLIPBOARD_SETTINGS_TEXTS } from '@/modules/clipboard/constants/texts';
import type { Clip } from '@/modules/clipboard/interfaces/clip';
import type { ClipboardStatus } from '@/modules/clipboard/interfaces/clipboardStatus';
import { holdWhile } from '@/modules/island/store/islandHolds';
import {
  COPY_CLIP,
  GET_CLIP_IMAGE,
  GET_CLIPBOARD_STATUS,
  LIST_CLIPS,
  PAUSE_CLIPBOARD,
  REMOVE_CLIPS,
  SET_CLIP_PINNED,
  SET_CLIPBOARD_ENABLED,
  SET_CLIPBOARD_EXCLUDED,
  SET_CLIPBOARD_LIMIT,
} from '@/shared/constants/events';

export const getClipboardStatus = (): Promise<ClipboardStatus> => invoke<ClipboardStatus>(GET_CLIPBOARD_STATUS);

export const setClipboardEnabled = (enabled: boolean): Promise<ClipboardStatus> => invoke<ClipboardStatus>(SET_CLIPBOARD_ENABLED, { enabled });

export const setClipboardLimit = (limit: number): Promise<ClipboardStatus> => invoke<ClipboardStatus>(SET_CLIPBOARD_LIMIT, { limit });

export const setClipboardExcluded = (excluded: string[]): Promise<ClipboardStatus> => invoke<ClipboardStatus>(SET_CLIPBOARD_EXCLUDED, { excluded });

// minutes null resumes.
export const pauseClipboard = (minutes: number | null): Promise<ClipboardStatus> => invoke<ClipboardStatus>(PAUSE_CLIPBOARD, { minutes });

// Pinned on top, then from the newest; Rust searches the whole texts.
export const listClips = (query: string): Promise<Clip[]> => invoke<Clip[]>(LIST_CLIPS, { query });

// An image or its thumbnail, decrypted, as PNG bytes kept in memory.
export const getClipImage = (id: string, thumb: boolean): Promise<ArrayBuffer> => invoke<ArrayBuffer>(GET_CLIP_IMAGE, { id, thumb });

export const copyClip = (id: string): Promise<void> => invoke(COPY_CLIP, { id });

export const removeClips = (ids: string[]): Promise<void> => invoke(REMOVE_CLIPS, { ids });

export const setClipPinned = (id: string, pinned: boolean): Promise<void> => invoke(SET_CLIP_PINNED, { id, pinned });

// A program to exclude, as its .exe; the island stays open while the picker is up.
export const pickProgram = async (): Promise<string | null> => {
  const picked = await holdWhile(() =>
    open({ multiple: false, directory: false, title: CLIPBOARD_SETTINGS_TEXTS.pickTitle, filters: [{ name: CLIPBOARD_SETTINGS_TEXTS.pickFilter, extensions: PROGRAM_EXTENSIONS }] }),
  );
  return typeof picked === 'string' ? picked : null;
};
