import { invoke } from '@tauri-apps/api/core';
import type { ActionReport } from '@/modules/actions/interfaces/actionReport';
import type { OpenedMedia } from '@/modules/media/interfaces/mediaInfo';
import type { TrimMode } from '@/modules/media/types/trimMode';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { CLOSE_MEDIA, GET_MEDIA_KEYFRAMES, GET_MEDIA_STRIP, GET_MEDIA_WAVE, MAKE_MEDIA_PREVIEW, OPEN_MEDIA, TRIM_MEDIA } from '@/shared/constants/events';

export const openMedia = (path: string): Promise<OpenedMedia> => invoke<OpenedMedia>(OPEN_MEDIA, { path });

// A light copy the player can play (MKV, AVI…); Rust deletes it when the screen closes.
export const makeMediaPreview = (path: string): Promise<string> => invoke<string>(MAKE_MEDIA_PREVIEW, { path });

export const getMediaKeyframes = (path: string): Promise<number[]> => invoke<number[]>(GET_MEDIA_KEYFRAMES, { path });

interface StripParams {
  path  : string;
  count : number;
}

// The frames of the timeline, one JPEG as an object URL.
export const getMediaStrip = async ({ path, count }: StripParams): Promise<string> =>
  URL.createObjectURL(new Blob([await invoke<ArrayBuffer>(GET_MEDIA_STRIP, { path, count })], { type: 'image/jpeg' }));

interface WaveParams {
  path : string;
  bars : number;
}

export const getMediaWave = ({ path, bars }: WaveParams): Promise<number[]> => invoke<number[]>(GET_MEDIA_WAVE, { path, bars });

export const closeMedia = (): Promise<void> => invoke(CLOSE_MEDIA);

interface TrimParams {
  path        : string;
  start       : number;
  end         : number;
  mode        : TrimMode;
  destination : SaveDestination;
  taskId      : string;
}

export const trimMedia = ({ path, start, end, mode, destination, taskId }: TrimParams): Promise<ActionReport> =>
  invoke<ActionReport>(TRIM_MEDIA, { request: { path, start, end, mode, destination, taskId } });
