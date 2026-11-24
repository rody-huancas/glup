import { invoke } from '@tauri-apps/api/core';
import type { HeifSupport } from '@/modules/photos/interfaces/heifSupport';
import { GET_HEIF_SUPPORT, GET_IMAGE_PREVIEW } from '@/shared/constants/events';

export const getHeifSupport = (): Promise<HeifSupport> => invoke<HeifSupport>(GET_HEIF_SUPPORT);

interface ImagePreviewParams {
  path : string;
  size : number;
}

// A small JPG made by Rust (the webview cannot show HEIC).
export const getImagePreview = async ({ path, size }: ImagePreviewParams): Promise<Uint8Array> =>
  new Uint8Array(await invoke<ArrayBuffer>(GET_IMAGE_PREVIEW, { path, size }));
