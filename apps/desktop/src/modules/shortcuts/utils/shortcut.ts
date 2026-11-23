import { MODIFIER_CODES, SHORTCUT_KEY } from '@/modules/shortcuts/constants/keys';
import { SHORTCUT_TEXTS } from '@/modules/shortcuts/constants/texts';
import type { KeyPress } from '@/modules/shortcuts/interfaces/keyPress';
import type { ShortcutPress } from '@/modules/shortcuts/types/shortcutPress';

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
