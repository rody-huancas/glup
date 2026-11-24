import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import { getExtension } from '@/modules/actions/utils/paths';
import { AVIF_EXTENSIONS, HEIC_EXTENSIONS } from '@/modules/photos/constants/photos';
import type { HeifSupport } from '@/modules/photos/interfaces/heifSupport';

export const isHeic = (path: string): boolean => HEIC_EXTENSIONS.includes(getExtension(path));

// Rust makes their previews: the webview shows no HEIC (and AVIF goes the same way, upright and in sRGB).
export const needsRustPreview = (path: string): boolean => isHeic(path) || AVIF_EXTENSIONS.includes(getExtension(path));

// "Fotos de iPhone a JPG" shows only when every file is a HEIC or HEIF.
export const allHeic = (files: FileInfo[]): boolean => files.length > 0 && files.every((file) => isHeic(file.path));

// FFmpeg has to be learned first when some photo is in a format this Windows cannot open.
export const needsPhotoTool = (files: FileInfo[], support: HeifSupport): boolean => {
  if (support.ffmpeg) return false;

  const heic = files.some((file) => isHeic(file.path));
  const avif = files.some((file) => AVIF_EXTENSIONS.includes(getExtension(file.path)));
  return (heic && !support.heic) || (avif && !support.avif);
};
