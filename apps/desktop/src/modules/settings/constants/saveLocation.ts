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
  saveMode      : 'same',
  customFolder  : null,
  bundleZip     : false,
  reduceLevel   : 'normal',
  folderMissing : false,
};

export const SETTINGS_TEXTS = {
  title    : 'Ajustes',
  subtitle : 'Por ahora, solo dónde guardo lo que hago.',
};
