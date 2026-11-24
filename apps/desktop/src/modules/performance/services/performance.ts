import { invoke } from '@tauri-apps/api/core';
import type { Overview } from '@/modules/performance/interfaces/overview';
import type { StartupEntry } from '@/modules/performance/interfaces/startupEntry';
import type { CloseOutcome } from '@/modules/performance/types/closeOutcome';
import { CLOSE_APP, FORCE_CLOSE_APP, GET_APP_ICON, GET_PERFORMANCE, GET_STARTUP_APPS, SET_STARTUP_APP } from '@/shared/constants/events';

export const getPerformance = (): Promise<Overview> => invoke<Overview>(GET_PERFORMANCE);

export const closeApp = (id: string): Promise<CloseOutcome> => invoke<CloseOutcome>(CLOSE_APP, { id });

export const forceCloseApp = (id: string): Promise<void> => invoke<void>(FORCE_CLOSE_APP, { id });

export const getStartupApps = (): Promise<StartupEntry[]> => invoke<StartupEntry[]>(GET_STARTUP_APPS);

interface SetStartupParams {
  id      : string;
  enabled : boolean;
}

export const setStartupApp = ({ id, enabled }: SetStartupParams): Promise<void> => invoke<void>(SET_STARTUP_APP, { id, enabled });

const icons = new Map<string, Promise<string | null>>();

// Each program's icon once per session (object URLs live as long as the app); null when it has none.
export const getAppIcon = (path: string): Promise<string | null> => {
  const cached = icons.get(path);
  if (cached) return cached;

  const loading = invoke<ArrayBuffer>(GET_APP_ICON, { path })
    .then((buffer) => (buffer.byteLength > 0 ? URL.createObjectURL(new Blob([buffer], { type: 'image/png' })) : null))
    .catch(() => null);
  icons.set(path, loading);
  return loading;
};
