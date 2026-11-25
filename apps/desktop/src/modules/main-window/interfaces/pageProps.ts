import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import type { PageId } from '@/modules/main-window/types/pageId';

export interface PageProps {
  // The screen showing (a family's screen knows which family it is).
  page       : PageId;
  files      : HomeFiles;
  onNavigate : (page: PageId) => void;
}
