import { SHORTCUT_TEXTS } from '@/modules/screen-text/constants/texts';
import { useShortcutView } from '@/modules/screen-text/hooks/useShortcutView';
import { shortcutKeys } from '@/modules/screen-text/utils/shortcut';

interface ShortcutSummaryProps {
  onChange: () => void;
}

// On the card in Herramientas: the shortcut in use ("Ctrl+Alt+Shift+T") and "Cambiar", which opens it
// in Ajustes.
export const ShortcutSummary = ({ onChange }: ShortcutSummaryProps) => {
  const { view } = useShortcutView();

  if (!view) return null;

  const status = !view.enabled ? SHORTCUT_TEXTS.cardOff : view.taken ? SHORTCUT_TEXTS.cardTaken : shortcutKeys(view.shortcut).join('+');

  return (
    <>
      <span className={view.taken && view.enabled ? 'truncate text-[11px] font-semibold text-lilac-soft' : 'truncate text-[11px] font-semibold text-text'}>
        {status}
      </span>
      <button
        type="button"
        onClick={onChange}
        aria-label={SHORTCUT_TEXTS.changeLabel}
        className="shrink-0 cursor-pointer rounded-md text-[11px] font-semibold text-lilac underline-offset-2 hover:text-lilac-soft hover:underline"
      >
        {SHORTCUT_TEXTS.change}
      </button>
    </>
  );
};
