import { invoke } from '@tauri-apps/api/core';
import type { LaunchInfo } from '@/modules/settings/interfaces/launchInfo';
import { GET_AUTOSTART, GET_LAUNCH_INFO, SET_AUTOSTART } from '@/shared/constants/events';

export const getLaunchInfo = (): Promise<LaunchInfo> => invoke<LaunchInfo>(GET_LAUNCH_INFO);

// What Windows really has (not what was saved).
export const getAutostart = (): Promise<boolean> => invoke<boolean>(GET_AUTOSTART);

// Resolves with the real state after the change.
export const setAutostart = (enabled: boolean): Promise<boolean> => invoke<boolean>(SET_AUTOSTART, { enabled });
