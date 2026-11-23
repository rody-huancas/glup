import { KNOWN_SHORTCUTS, TAB_DIGIT } from '@/modules/shortcuts/constants/knownShortcuts';
import { SHORTCUT_TEXTS } from '@/modules/shortcuts/constants/texts';
import { shortcutKeys } from '@/modules/shortcuts/utils/shortcut';

const ALT_GR_KEY = /^(Key[A-Z]|Digit[0-9])$/;

// Why a new shortcut could get in the way (null when it looks free). Another program having it is
// something only Windows knows: Rust says so when it tries to register it.
export const shortcutConflict = (shortcut: string): string | null => {
  const parts = shortcut.split('+');
  const key   = parts[parts.length - 1] ?? '';
  const label = shortcutKeys(shortcut).join('+');
  const known = KNOWN_SHORTCUTS[shortcut];

  if (known) return SHORTCUT_TEXTS.knownConflict({ label, use: known });
  if (TAB_DIGIT.test(shortcut)) return SHORTCUT_TEXTS.knownConflict({ label, use: SHORTCUT_TEXTS.tabsUse });
  if (parts.includes('Super')) return SHORTCUT_TEXTS.windowsConflict(label);
  if (parts.includes('Ctrl') && parts.includes('Alt') && !parts.includes('Shift') && ALT_GR_KEY.test(key)) return SHORTCUT_TEXTS.altGrConflict(label);
  if (parts.length === 2 && parts[0] === 'Alt' && key.startsWith('Key')) return SHORTCUT_TEXTS.knownConflict({ label, use: SHORTCUT_TEXTS.menusUse });

  return null;
};
