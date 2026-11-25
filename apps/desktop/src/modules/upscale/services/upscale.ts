import { invoke } from '@tauri-apps/api/core';
import type { ModelStatus } from '@/modules/background/interfaces/modelStatus';
import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';
import type { UpscaleOptions } from '@/modules/upscale/interfaces/upscaleOptions';
import type { UpscaleLevel } from '@/modules/upscale/types/upscaleLevel';
import { DELETE_UPSCALE_MODEL, DOWNLOAD_UPSCALE_MODEL, GET_UPSCALE_MODEL, GET_UPSCALE_PREVIEW } from '@/shared/constants/events';

export const getUpscaleModel = (level: UpscaleLevel): Promise<ModelStatus> => invoke<ModelStatus>(GET_UPSCALE_MODEL, { level });

export const downloadUpscaleModel = (level: UpscaleLevel, taskId: string): Promise<TaskSummary> => invoke<TaskSummary>(DOWNLOAD_UPSCALE_MODEL, { request: { level, taskId } });

export const deleteUpscaleModel = (level: UpscaleLevel): Promise<void> => invoke<void>(DELETE_UPSCALE_MODEL, { level });

interface PreviewParams {
  path    : string;
  options : UpscaleOptions;
}

// A piece of the photo, before on the left half and after on the right, as an object URL.
export const getUpscalePreview = async ({ path, options }: PreviewParams): Promise<string> =>
  URL.createObjectURL(new Blob([await invoke<ArrayBuffer>(GET_UPSCALE_PREVIEW, { request: { path, options, x: null, y: null } })], { type: 'image/jpeg' }));
