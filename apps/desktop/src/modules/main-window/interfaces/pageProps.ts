import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import type { PageId } from '@/modules/main-window/types/pageId';

export interface PageProps {
  files      : HomeFiles;
  onNavigate : (page: PageId) => void;
}
