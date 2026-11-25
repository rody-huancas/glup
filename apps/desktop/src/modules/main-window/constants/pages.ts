import { CleanupPage } from '@/modules/cleanup/pages/CleanupPage';
import { ClipboardPage } from '@/modules/clipboard/pages/ClipboardPage';
import { DuplicatesPage } from '@/modules/duplicates/pages/DuplicatesPage';
import { FamilyPage } from '@/modules/families/pages/FamilyPage';
import { FolderSortPage } from '@/modules/folder-sort/pages/FolderSortPage';
import { HistoryPage } from '@/modules/history/pages/HistoryPage';
import { HomePage } from '@/modules/home/pages/HomePage';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import type { PageId } from '@/modules/main-window/types/pageId';
import { PerformancePage } from '@/modules/performance/pages/PerformancePage';
import { QrCreatePage } from '@/modules/qr/pages/QrCreatePage';
import { QrReadPage } from '@/modules/qr/pages/QrReadPage';
import { RenamePage } from '@/modules/rename/pages/RenamePage';
import { SettingsPage } from '@/modules/settings/pages/SettingsPage';
import { SpacePage } from '@/modules/space/pages/SpacePage';
import { ToolsPage } from '@/modules/tools/pages/ToolsPage';
import type { ComponentType } from 'react';

// Screens with their own list that scrolls (their header stays); every other one scrolls whole, with
// room at its end.
export const SELF_SCROLLING: PageId[] = ['tools', 'cleanup', 'folder-sort', 'performance', 'duplicates'];

export const PAGES: Record<PageId, ComponentType<PageProps>> = {
  'home'             : HomePage,
  'tools'            : ToolsPage,
  'cleanup'          : CleanupPage,
  'history'          : HistoryPage,
  'settings'         : SettingsPage,
  'clipboard'        : ClipboardPage,
  'folder-sort'      : FolderSortPage,
  'duplicates'       : DuplicatesPage,
  'performance'      : PerformancePage,
  'qr-create'        : QrCreatePage,
  'qr-read'          : QrReadPage,
  'space'            : SpacePage,
  'batch-rename'     : RenamePage,
  'family-images'    : FamilyPage,
  'family-pdf'       : FamilyPage,
  'family-media'     : FamilyPage,
  'family-text'      : FamilyPage,
  'family-clipboard' : FamilyPage,
  'family-pc'        : FamilyPage,
};
