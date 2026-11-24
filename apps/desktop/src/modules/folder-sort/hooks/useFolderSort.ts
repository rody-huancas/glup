import { useSyncExternalStore } from 'react';
import { getFolderSort, subscribeFolderSort } from '@/modules/folder-sort/store/folderSortStore';

export const useFolderSort = () => useSyncExternalStore(subscribeFolderSort, getFolderSort);
