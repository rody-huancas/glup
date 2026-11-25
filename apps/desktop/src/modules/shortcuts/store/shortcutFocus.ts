import type { ShortcutTarget } from '@/modules/shortcuts/types/shortcutTarget';

// "Cambiar" on a card in Habilidades: Ajustes opens with that shortcut's setting in view and focused.
let requested: ShortcutTarget | null = null;

export const requestShortcutFocus = (target: ShortcutTarget) => {
  requested = target;
};

// True once per request, for the setting that was asked for.
export const takeShortcutFocus = (target: ShortcutTarget): boolean => {
  if (requested !== target) return false;

  requested = null;
  return true;
};
