import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { UPDATE_TEXTS } from '@/modules/updates/constants/texts';
import type { UpdateProgress } from '@/modules/updates/interfaces/updateProgress';

// 0 to 1 for the bar; null (indeterminate) until the size is known.
export const progressValue = (progress: UpdateProgress | null): number | null => {
  if (!progress || !progress.total) return null;
  return Math.min(progress.downloaded / progress.total, 1);
};

// "12 MB de 18 MB", or only what arrived when the size is unknown.
export const progressDetail = (progress: UpdateProgress | null): string | null => {
  if (!progress) return null;
  if (!progress.total) return formatFileSize(progress.downloaded);
  return UPDATE_TEXTS.progress(formatFileSize(progress.downloaded), formatFileSize(progress.total));
};

// Everything arrived: the installer is the one working now.
export const isDownloaded = (progress: UpdateProgress | null): boolean =>
  Boolean(progress?.total && progress.downloaded >= progress.total);
