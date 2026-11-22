import { invoke } from '@tauri-apps/api/core';
import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import { GET_FILES_INFO } from '@/shared/constants/events';

export const getFilesInfo = (paths: string[]): Promise<FileInfo[]> => invoke<FileInfo[]>(GET_FILES_INFO, { paths });
