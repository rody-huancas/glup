import { invoke } from '@tauri-apps/api/core';
import type { PageId } from '@/modules/main-window/types/pageId';
import { IS_GLUP_IN_FRONT, NOTIFY_TASK } from '@/shared/constants/events';

interface NotifyTaskParams {
  body : string;
  page : PageId;
}

// A Windows notification; resolves false when it did not show (turned off in Ajustes, or failed).
export const notifyTask = ({ body, page }: NotifyTaskParams): Promise<boolean> => invoke<boolean>(NOTIFY_TASK, { request: { body, page } });

export const isGlupInFront = (): Promise<boolean> => invoke<boolean>(IS_GLUP_IN_FRONT);
