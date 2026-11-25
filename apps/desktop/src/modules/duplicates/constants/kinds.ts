import type { FileKind } from '@/modules/duplicates/types/fileKind';

export const KIND_EXTENSIONS: Record<Exclude<FileKind, 'all' | 'other'>, string[]> = {
  photos    : ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'hif', 'avif', 'gif', 'bmp', 'tif', 'tiff'],
  videos    : ['mp4', 'mov', 'mkv', 'avi', 'webm', '3gp', 'm4v'],
  documents : ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'odt', 'ods', 'odp', 'rtf', 'csv'],
};

export const FILE_KINDS: FileKind[] = ['all', 'photos', 'videos', 'documents', 'other'];
