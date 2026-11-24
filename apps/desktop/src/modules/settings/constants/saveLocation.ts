import type { SettingsView } from '@/modules/settings/interfaces/appSettings';
import type { SaveOption } from '@/modules/settings/interfaces/saveOption';

export const SAVE_TEXTS = {
  label         : 'Guardar en:',
  folderMissing : 'La carpeta elegida ya no está; guardo en la misma carpeta.',
  pickTitle     : 'Dónde guardo lo que hago',
  defaultTitle  : 'Dónde guardar por defecto',
};

export const SAVE_OPTIONS: SaveOption[] = [
  { mode: 'same', label: 'Misma carpeta' },
  { mode: 'glup', label: 'Carpeta "Glup"' },
  { mode: 'custom', label: 'Elegir carpeta…' },
];

export const DEFAULT_SETTINGS: SettingsView = {
  saveMode              : 'same',
  customFolder          : null,
  bundleZip             : false,
  reduceLevel           : 'normal',
  // Seen until the real settings say otherwise, so the welcome never flashes.
  welcomeSeen           : true,
  notificationsOff      : false,
  transcribeLevel       : 'fast',
  screenTextShortcut    : null,
  screenTextShortcutOff : false,
  screenTextHistoryOff  : false,
  clipboardOn           : false,
  clipboardLimit        : null,
  clipboardExcluded     : [],
  clipboardShortcut     : null,
  clipboardShortcutOff  : false,
  islandDock            : null,
  folderMissing         : false,
};

export const SETTINGS_TEXTS = {
  title    : 'Ajustes',
  subtitle : 'Cómo arranco y dónde guardo lo que hago.',
};
