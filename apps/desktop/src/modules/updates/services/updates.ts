import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import type { UpdateInfo } from '@/modules/updates/interfaces/updateInfo';
import { CHECK_UPDATE, GET_UPDATE, INSTALL_UPDATE } from '@/shared/constants/events';

export const getAppVersion = (): Promise<string> => getVersion();

// What Glup's own check (at start and every 6 hours) already found.
export const getUpdate = (): Promise<UpdateInfo | null> => invoke<UpdateInfo | null>(GET_UPDATE);

export const checkUpdate = (): Promise<UpdateInfo | null> => invoke<UpdateInfo | null>(CHECK_UPDATE);

// Resolves only if it fails: when it works, the installer closes Glup and opens the new version.
export const installUpdate = (): Promise<void> => invoke<void>(INSTALL_UPDATE);
