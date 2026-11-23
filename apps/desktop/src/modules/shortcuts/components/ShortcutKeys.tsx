import { SHORTCUT_TEXTS } from '@/modules/shortcuts/constants/texts';
import { shortcutKeys } from '@/modules/shortcuts/utils/shortcut';

interface ShortcutKeysProps {
  shortcut: string;
}

// The shortcut drawn as keyboard caps: [Ctrl] [Alt] [Shift] [T].
export const ShortcutKeys = ({ shortcut }: ShortcutKeysProps) => {
  const keys = shortcutKeys(shortcut);

  return (
    <span className="flex items-center gap-1" aria-label={SHORTCUT_TEXTS.keysLabel(keys.join(' + '))}>
      {keys.map((key) => (
        <kbd key={key} aria-hidden className="rounded-md border border-line-strong bg-raised px-2 py-0.5 font-sans text-[11px] font-semibold text-text">
          {key}
        </kbd>
      ))}
    </span>
  );
};
