import { SHORTCUT_TEXTS } from '@/modules/shortcuts/constants/texts';
import { useShortcutView } from '@/modules/shortcuts/hooks/useShortcutView';
import type { ShortcutTarget } from '@/modules/shortcuts/types/shortcutTarget';
import { shortcutKeys } from '@/modules/shortcuts/utils/shortcut';

interface ShortcutSummaryProps {
  target   : ShortcutTarget;
  onChange : (target: ShortcutTarget) => void;
}

// On the card in Herramientas: the shortcut in use ("Ctrl+Alt+Shift+T") and "Cambiar", which opens it
// in Ajustes.
export const ShortcutSummary = ({ target, onChange }: ShortcutSummaryProps) => {
  const { view } = useShortcutView(target);

  if (!view) return null;

  const status = !view.enabled ? SHORTCUT_TEXTS.cardOff : view.taken ? SHORTCUT_TEXTS.cardTaken : shortcutKeys(view.shortcut).join('+');

  return (
    <>
      <span className={view.taken && view.enabled ? 'truncate text-[11px] font-semibold text-lilac-soft' : 'truncate text-[11px] font-semibold text-text'}>
        {status}
      </span>
      <button
        type="button"
        onClick={() => onChange(target)}
        aria-label={SHORTCUT_TEXTS.changeLabel}
        className="shrink-0 cursor-pointer rounded-md text-[11px] font-semibold text-lilac underline-offset-2 hover:text-lilac-soft hover:underline"
      >
        {SHORTCUT_TEXTS.change}
      </button>
    </>
  );
};
