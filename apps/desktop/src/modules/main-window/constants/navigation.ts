import type { NavItemDefinition } from '@/modules/main-window/interfaces/navItem';
import type { PageId } from '@/modules/main-window/types/pageId';
import { CleanupIcon } from '@/shared/icons/CleanupIcon';
import { HistoryIcon } from '@/shared/icons/HistoryIcon';
import { HomeIcon } from '@/shared/icons/HomeIcon';
import { SettingsIcon } from '@/shared/icons/SettingsIcon';
import { ToolsIcon } from '@/shared/icons/ToolsIcon';

export const DEFAULT_PAGE: PageId = 'home';

export const NAV_TEXTS = {
  newResult : 'Resultado nuevo',
};

export const NAV_ITEMS: NavItemDefinition[] = [
  { id: 'home', label: 'Inicio', icon: HomeIcon },
  { id: 'tools', label: 'Herramientas', icon: ToolsIcon },
  { id: 'cleanup', label: 'Limpieza', icon: CleanupIcon },
  { id: 'history', label: 'Historial', icon: HistoryIcon },
  { id: 'settings', label: 'Ajustes', icon: SettingsIcon },
];
