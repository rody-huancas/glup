import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import { getExtension } from '@/modules/actions/utils/paths';
import { AVIF_EXTENSIONS, HEIC_EXTENSIONS } from '@/modules/photos/constants/photos';
import type { HeifSupport } from '@/modules/photos/interfaces/heifSupport';

export const isHeic = (path: string): boolean => HEIC_EXTENSIONS.includes(getExtension(path));

// Rust makes their previews: the webview shows no HEIC (and AVIF goes the same way, upright and in sRGB).
export const needsRustPreview = (path: string): boolean => isHeic(path) || AVIF_EXTENSIONS.includes(getExtension(path));

// "Fotos de iPhone a JPG" shows only when every file is a HEIC or HEIF.
export const allHeic = (files: FileInfo[]): boolean => files.length > 0 && files.every((file) => isHeic(file.path));

// This photo needs FFmpeg to open: a HEIC or AVIF this Windows cannot open, and FFmpeg not here.
export const pathNeedsPhotoTool = (path: string, support: HeifSupport): boolean => {
  if (support.ffmpeg) return false;
  return (isHeic(path) && !support.heic) || (AVIF_EXTENSIONS.includes(getExtension(path)) && !support.avif);
};

// FFmpeg has to be learned first when some photo is in a format this Windows cannot open.
export const needsPhotoTool = (files: FileInfo[], support: HeifSupport): boolean => files.some((file) => pathNeedsPhotoTool(file.path, support));
