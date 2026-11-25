import { invoke } from '@tauri-apps/api/core';
import type { PhotoFrame } from '@/modules/photo-tools/interfaces/photoFrame';
import { FIND_PHOTO_FACE, GET_PHOTO_PREVIEW, GET_PHOTO_SIZES } from '@/shared/constants/events';

interface PreviewParams {
  path : string;
  size : number;
}

// The photo upright as a JPG (HEIC too), as an object URL: revoke it when it is not shown any more.
export const getPhotoPreview = async ({ path, size }: PreviewParams): Promise<string> =>
  URL.createObjectURL(new Blob([await invoke<ArrayBuffer>(GET_PHOTO_PREVIEW, { path, size })], { type: 'image/jpeg' }));

export const findPhotoFace = (path: string): Promise<PhotoFrame | null> => invoke<PhotoFrame | null>(FIND_PHOTO_FACE, { path });

// Width and height of each photo as shown (null when it cannot be read).
export const getPhotoSizes = (paths: string[]): Promise<([number, number] | null)[]> => invoke<([number, number] | null)[]>(GET_PHOTO_SIZES, { paths });
