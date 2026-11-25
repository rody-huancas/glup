import { invoke } from '@tauri-apps/api/core';
import type { DuplicateDefaults } from '@/modules/duplicates/interfaces/duplicateDefaults';
import type { DuplicatesScan } from '@/modules/duplicates/interfaces/duplicatesScan';
import type { RemoveReport } from '@/modules/duplicates/interfaces/removeReport';
import { CHECK_DUPLICATE_FOLDER, GET_DUPLICATE_DEFAULTS, REMOVE_DUPLICATES, SCAN_DUPLICATES } from '@/shared/constants/events';

export const getDuplicateDefaults = (): Promise<DuplicateDefaults> => invoke<DuplicateDefaults>(GET_DUPLICATE_DEFAULTS);

// Why a folder cannot be added (Windows, programs, AppData, the recycle bin), or null.
export const checkDuplicateFolder = (path: string): Promise<string | null> => invoke<string | null>(CHECK_DUPLICATE_FOLDER, { path });

interface ScanParams {
  folders : string[];
  minSize : number;
  similar : boolean;
  taskId  : string;
}

// Only looks; the files are kept by Rust for the quitting.
export const scanDuplicates = ({ folders, minSize, similar, taskId }: ScanParams): Promise<DuplicatesScan> =>
  invoke<DuplicatesScan>(SCAN_DUPLICATES, { request: { folders, minSize, similar, taskId } });

interface RemoveParams {
  paths  : string[];
  taskId : string;
}

export const removeDuplicates = ({ paths, taskId }: RemoveParams): Promise<RemoveReport> =>
  invoke<RemoveReport>(REMOVE_DUPLICATES, { request: { paths, taskId } });
