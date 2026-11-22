import { invoke } from '@tauri-apps/api/core';
import type { CleanReport } from '@/modules/cleanup/interfaces/cleanReport';
import type { CleanRequest } from '@/modules/cleanup/interfaces/cleanRequest';
import type { CleanupScan } from '@/modules/cleanup/interfaces/cleanupScan';
import type { DiskSpace } from '@/modules/cleanup/interfaces/diskSpace';
import { CLEAN_UP, GET_DISK_SPACE, SCAN_CLEANUP } from '@/shared/constants/events';

export const getDiskSpace = (): Promise<DiskSpace> => invoke<DiskSpace>(GET_DISK_SPACE);

// Only looks; every category also arrives on its own (CLEANUP_CATEGORY_EVENT) as soon as it is done.
export const scanCleanup = (taskId: string): Promise<CleanupScan> => invoke<CleanupScan>(SCAN_CLEANUP, { request: { taskId } });

export const cleanUp = ({ paths, emptyRecycleBin, taskId }: CleanRequest): Promise<CleanReport> =>
  invoke<CleanReport>(CLEAN_UP, { request: { paths, emptyRecycleBin, taskId } });
