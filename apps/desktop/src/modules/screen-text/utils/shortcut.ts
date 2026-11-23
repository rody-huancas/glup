import { MODIFIER_CODES, SHORTCUT_KEY } from '@/modules/screen-text/constants/screenText';
import { SHORTCUT_TEXTS } from '@/modules/screen-text/constants/texts';
import type { KeyPress } from '@/modules/screen-text/interfaces/keyPress';
import type { ShortcutPress } from '@/modules/screen-text/types/shortcutPress';

// The keys pressed in Ajustes as Rust registers them: "Ctrl+Alt+Shift+KeyT". Shift alone is not
// enough, it would get in the way of typing.
export const shortcutFromPress = (press: KeyPress): ShortcutPress => {
  if (MODIFIER_CODES.includes(press.code)) return { kind: 'partial' };
  if (!SHORTCUT_KEY.test(press.code) || !(press.ctrlKey || press.altKey || press.metaKey)) return { kind: 'invalid' };

  const modifiers = [press.ctrlKey && 'Ctrl', press.altKey && 'Alt', press.shiftKey && 'Shift', press.metaKey && 'Super'].filter(Boolean);
  return { kind: 'shortcut', shortcut: [...modifiers, press.code].join('+') };
};

const keyLabel = (part: string): string => {
  if (part === 'Super') return SHORTCUT_TEXTS.windows;
  if (part === 'Space') return SHORTCUT_TEXTS.space;
  return part.replace(/^Key|^Digit/, '');
};

// The caps Ajustes draws: ["Ctrl", "Alt", "Shift", "T"].
export const shortcutKeys = (shortcut: string): string[] => shortcut.split('+').map(keyLabel);
