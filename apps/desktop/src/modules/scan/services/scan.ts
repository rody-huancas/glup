import { invoke } from '@tauri-apps/api/core';
import type { ActionReport } from '@/modules/actions/interfaces/actionReport';
import type { ScanPageRequest } from '@/modules/scan/interfaces/scanPageRequest';
import type { ScanPhoto } from '@/modules/scan/interfaces/scanPhoto';
import type { ScanMode } from '@/modules/scan/types/scanMode';
import type { ScanPaper } from '@/modules/scan/types/scanPaper';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { CLOSE_SCAN, GET_SCAN_PHOTO, GET_SCAN_PREVIEW, OPEN_SCAN_PHOTO, SCAN_DOCUMENT } from '@/shared/constants/events';

const toUrl = (bytes: ArrayBuffer): string => URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));

// Opened by Rust (any photo: HEIC and AVIF too, upright) with the sheet it found.
export const openScanPhoto = (path: string): Promise<ScanPhoto> => invoke<ScanPhoto>(OPEN_SCAN_PHOTO, { path });

interface PhotoParams {
  path : string;
  size : number;
}

// The photo upright and small, as an object URL (revoked by whoever asked for it).
export const getScanPhoto = async ({ path, size }: PhotoParams): Promise<string> => toUrl(await invoke<ArrayBuffer>(GET_SCAN_PHOTO, { path, size }));

interface PreviewParams {
  page : ScanPageRequest;
  mode : ScanMode;
}

// The page as it will come out, as an object URL.
export const getScanPreview = async ({ page, mode }: PreviewParams): Promise<string> => toUrl(await invoke<ArrayBuffer>(GET_SCAN_PREVIEW, { request: { page, mode } }));

// Left without saving: Rust lets the photos go.
export const closeScan = (): Promise<void> => invoke(CLOSE_SCAN);

interface ScanDocumentParams {
  pages       : ScanPageRequest[];
  mode        : ScanMode;
  paper       : ScanPaper;
  searchable  : boolean;
  destination : SaveDestination;
  taskId      : string;
}

// A task like the other actions: stages, Cancelar, result and history.
export const scanDocument = ({ pages, mode, paper, searchable, destination, taskId }: ScanDocumentParams): Promise<ActionReport> =>
  invoke<ActionReport>(SCAN_DOCUMENT, { request: { pages, mode, paper, searchable, destination, taskId } });
