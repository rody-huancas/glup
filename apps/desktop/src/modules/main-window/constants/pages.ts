import type { ComponentType } from 'react';
import { CleanupPage } from '@/modules/cleanup/pages/CleanupPage';
import { ClipboardPage } from '@/modules/clipboard/pages/ClipboardPage';
import { FamilyPage } from '@/modules/families/pages/FamilyPage';
import { FolderSortPage } from '@/modules/folder-sort/pages/FolderSortPage';
import { HistoryPage } from '@/modules/history/pages/HistoryPage';
import { HomePage } from '@/modules/home/pages/HomePage';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import type { PageId } from '@/modules/main-window/types/pageId';
import { PerformancePage } from '@/modules/performance/pages/PerformancePage';
import { SettingsPage } from '@/modules/settings/pages/SettingsPage';
import { ToolsPage } from '@/modules/tools/pages/ToolsPage';

// Screens with their own list that scrolls (their header stays); every other one scrolls whole, with
// room at its end.
export const SELF_SCROLLING: PageId[] = ['tools', 'cleanup', 'folder-sort', 'performance'];

export const PAGES: Record<PageId, ComponentType<PageProps>> = {
  'home'             : HomePage,
  'tools'            : ToolsPage,
  'cleanup'          : CleanupPage,
  'history'          : HistoryPage,
  'settings'         : SettingsPage,
  'clipboard'        : ClipboardPage,
  'folder-sort'      : FolderSortPage,
  'performance'      : PerformancePage,
  'family-images'    : FamilyPage,
  'family-pdf'       : FamilyPage,
  'family-media'     : FamilyPage,
  'family-text'      : FamilyPage,
  'family-clipboard' : FamilyPage,
  'family-pc'        : FamilyPage,
};
