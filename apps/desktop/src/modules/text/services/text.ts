import { invoke } from '@tauri-apps/api/core';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import type { FileText } from '@/modules/text/interfaces/fileText';
import type { TextReport } from '@/modules/text/interfaces/textReport';
import { FINISH_TEXT, GET_TEXT_SUPPORT, READ_IMAGE_TEXT, READ_PAGE_TEXT, SAVE_TEXT } from '@/shared/constants/events';

interface TextSupport {
  supported : boolean;
  language  : string | null;
}

interface FinishTextParams {
  paths : string[];
  files : FileText[];
}

interface SaveTextParams {
  paths       : string[];
  text        : string;
  destination : SaveDestination;
  entryId     : string | null;
}

export const getTextSupport = (): Promise<TextSupport> => invoke<TextSupport>(GET_TEXT_SUPPORT);

// The OCR of Windows on an image file.
export const readImageText = (path: string): Promise<string> => invoke<string>(READ_IMAGE_TEXT, { request: { path } });

// The OCR on a scanned PDF page, rendered by pdf.js: raw PNG bytes, without JSON.
export const readPageText = (bytes: Uint8Array): Promise<string> => invoke<string>(READ_PAGE_TEXT, bytes);

// Rust puts the text together and keeps it in the history.
export const finishText = ({ paths, files }: FinishTextParams): Promise<TextReport> => invoke<TextReport>(FINISH_TEXT, { request: { paths, files } });

// Resolves the path of the .txt.
export const saveText = ({ paths, text, destination, entryId }: SaveTextParams): Promise<string> =>
  invoke<string>(SAVE_TEXT, { request: { paths, text, destination, entryId } });
