import type { NavItemDefinition } from '@/modules/main-window/interfaces/navItem';
import type { PageId } from '@/modules/main-window/types/pageId';
import { HistoryIcon } from '@/shared/icons/HistoryIcon';
import { HomeIcon } from '@/shared/icons/HomeIcon';
import { SettingsIcon } from '@/shared/icons/SettingsIcon';
import { ToolsIcon } from '@/shared/icons/ToolsIcon';

export const DEFAULT_PAGE: PageId = 'home';

// The top of the bar. Habilidades holds the families and every tool, so their screens light it.
export const NAV_ITEMS: NavItemDefinition[] = [
  { id: 'home', label: 'Inicio', icon: HomeIcon },
  { id: 'tools', label: 'Habilidades', icon: ToolsIcon },
  { id: 'history', label: 'Historial', icon: HistoryIcon },
];

// At the foot of the bar.
export const SETTINGS_ITEM: NavItemDefinition = { id: 'settings', label: 'Ajustes', icon: SettingsIcon };

// The screens with an item of their own; any other (a family, Limpieza, Rendimiento…) is under Habilidades.
export const OWN_ITEMS: PageId[] = ['home', 'history', 'settings'];
