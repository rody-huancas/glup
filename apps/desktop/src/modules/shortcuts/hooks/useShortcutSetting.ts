import { useCallback, useEffect, useState } from 'react';
import { useIslandHold } from '@/modules/island/hooks/useIslandHold';
import { SHORTCUT_TEXTS } from '@/modules/shortcuts/constants/texts';
import { useShortcutView } from '@/modules/shortcuts/hooks/useShortcutView';
import type { ShortcutWarning } from '@/modules/shortcuts/interfaces/shortcutWarning';
import { pauseShortcuts, setShortcut } from '@/modules/shortcuts/services/shortcuts';
import type { ShortcutTarget } from '@/modules/shortcuts/types/shortcutTarget';
import { shortcutFromPress } from '@/modules/shortcuts/utils/shortcut';
import { shortcutConflict } from '@/modules/shortcuts/utils/shortcutConflict';

// Ajustes › one of Glup's shortcuts: on or off, and "Cambiar" listens for the next combination. A
// well-known one (Ctrl+C, Alt+F4…) waits for "Guardar igual"; Rust tries it before saving, so one another
// program (or another shortcut of Glup) already has is refused with its reason.
export const useShortcutSetting = (target: ShortcutTarget) => {
  const { view, setView, failed } = useShortcutView(target);
  const [listening, setListening] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [warning, setWarning]     = useState<ShortcutWarning | null>(null);

  // While listening or deciding the island stays open, and Glup's shortcuts do not fire.
  useIslandHold(listening || warning !== null);

  useEffect(() => {
    if (!listening) return;

    void pauseShortcuts(true).catch(() => undefined);
    return () => void pauseShortcuts(false).catch(() => undefined);
  }, [listening]);

  const save = useCallback((shortcut: string | null, enabled: boolean) => {
    setSaving(true);
    setError(null);
    setWarning(null);

    void setShortcut({ target, shortcut, enabled })
      .then((next) => {
        setView(next);
        setListening(false);
      })
      .catch((message: unknown) => setError(typeof message === 'string' ? message : SHORTCUT_TEXTS.failed))
      .finally(() => setSaving(false));
  }, [target, setView]);

  // Captured before anything else, so Esc stops listening instead of collapsing the island.
  useEffect(() => {
    if (!listening) return;

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const modified = event.ctrlKey || event.altKey || event.metaKey || event.shiftKey;
      if (event.key === 'Escape' && !modified) return setListening(false);

      const press = shortcutFromPress(event);
      if (press.kind === 'invalid') return setError(SHORTCUT_TEXTS.invalid);
      if (press.kind !== 'shortcut') return;

      const conflict = shortcutConflict(press.shortcut);
      if (!conflict) return save(press.shortcut, true);

      setError(null);
      setListening(false);
      setWarning({ shortcut: press.shortcut, message: conflict });
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [listening, save]);

  const listen = useCallback(() => {
    setError(null);
    setWarning(null);
    setListening(true);
  }, []);

  const stopListening = useCallback(() => setListening(false), []);
  const toggle        = useCallback((enabled: boolean) => save(null, enabled), [save]);
  const saveAnyway    = useCallback(() => {
    if (warning) save(warning.shortcut, true);
  }, [warning, save]);

  return { view, failed, listening, saving, error, warning, listen, stopListening, toggle, saveAnyway };
};
