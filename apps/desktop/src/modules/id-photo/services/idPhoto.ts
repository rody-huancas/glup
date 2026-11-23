import { invoke } from '@tauri-apps/api/core';
import type { ActionReport } from '@/modules/actions/interfaces/actionReport';
import type { IdChoice } from '@/modules/id-photo/interfaces/idChoice';
import type { IdCrop } from '@/modules/id-photo/interfaces/idCrop';
import type { IdFormat } from '@/modules/id-photo/interfaces/idFormat';
import type { PrepareReport } from '@/modules/id-photo/interfaces/prepareReport';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { ID_PHOTO_PREVIEW, PREPARE_ID_PHOTO, SAVE_ID_PHOTO } from '@/shared/constants/events';

interface PrepareParams {
  path   : string;
  format : IdFormat;
}

interface SaveParams {
  session     : number;
  crop        : IdCrop;
  choice      : IdChoice;
  destination : SaveDestination;
  taskId      : string;
}

// Removes the background and finds the face (a few seconds the first time).
export const prepareIdPhoto = ({ path, format }: PrepareParams): Promise<PrepareReport> => invoke<PrepareReport>(PREPARE_ID_PHOTO, { request: { path, format } });

// The photo over white, as an object URL for the preview.
export const idPhotoPreview = async (session: number): Promise<string> => {
  const bytes = await invoke<ArrayBuffer>(ID_PHOTO_PREVIEW, { session });
  return URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
};

export const saveIdPhoto = ({ session, crop, choice, destination, taskId }: SaveParams): Promise<ActionReport> =>
  invoke<ActionReport>(SAVE_ID_PHOTO, { request: { session, crop, format: choice.format, outputs: choice.outputs, destination, taskId } });
