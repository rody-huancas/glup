import { invoke } from '@tauri-apps/api/core';
import type { LaunchInfo } from '@/modules/settings/interfaces/launchInfo';
import { GET_AUTOSTART, GET_LAUNCH_INFO, SET_AUTOSTART, TAKE_LAUNCH_OPEN } from '@/shared/constants/events';

export const getLaunchInfo = (): Promise<LaunchInfo> => invoke<LaunchInfo>(GET_LAUNCH_INFO);

// True only once per process, and only if Glup was opened by hand (not by Windows at startup).
export const takeLaunchOpen = (): Promise<boolean> => invoke<boolean>(TAKE_LAUNCH_OPEN);

// What Windows really has (not what was saved).
export const getAutostart = (): Promise<boolean> => invoke<boolean>(GET_AUTOSTART);

// Resolves with the real state after the change.
export const setAutostart = (enabled: boolean): Promise<boolean> => invoke<boolean>(SET_AUTOSTART, { enabled });
