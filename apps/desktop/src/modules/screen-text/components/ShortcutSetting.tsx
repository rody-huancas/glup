import { useEffect, useRef } from 'react';
import { ShortcutKeys } from '@/modules/screen-text/components/ShortcutKeys';
import { SHORTCUT_TEXTS } from '@/modules/screen-text/constants/texts';
import { useShortcutSetting } from '@/modules/screen-text/hooks/useShortcutSetting';
import { takeShortcutFocus } from '@/modules/screen-text/store/shortcutFocus';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Switch } from '@/shared/components/Switch';

// Ajustes › General: the shortcut that opens "Copiar texto de la pantalla" from any app.
export const ShortcutSetting = () => {
  const setting    = useShortcutSetting();
  const view       = setting.view;
  const sectionRef = useRef<HTMLDivElement>(null);

  // Arriving from "Cambiar" in Herramientas: in view, with the focus on its first control.
  useEffect(() => {
    if (!view || !takeShortcutFocus()) return;

    sectionRef.current?.scrollIntoView({ block: 'center' });
    sectionRef.current?.querySelector<HTMLButtonElement>(view.enabled ? '[data-shortcut-change] button' : '[role="switch"]')?.focus();
  }, [view]);

  if (!view) return setting.failed ? <p className="text-[11px] text-lilac-soft">{SHORTCUT_TEXTS.failed}</p> : <Skeleton className="h-9 w-72" />;

  return (
    <div ref={sectionRef} className="flex flex-col gap-2">
      <Switch
        label={SHORTCUT_TEXTS.label}
        hint={view.taken ? SHORTCUT_TEXTS.taken : SHORTCUT_TEXTS.hint}
        checked={view.enabled}
        disabled={setting.saving || setting.listening}
        onChange={setting.toggle}
      />
      {view.enabled && (
        <div className="flex items-center gap-3 pl-12" data-shortcut-change="">
          {setting.listening ? (
            <span aria-live="polite" className="text-[12px] font-semibold text-lilac-soft">{SHORTCUT_TEXTS.listening}</span>
          ) : (
            <ShortcutKeys shortcut={view.shortcut} />
          )}
          <Button variant="secondary" disabled={setting.saving} onClick={setting.listening ? setting.stopListening : setting.listen} className="h-8 px-3 text-[12px]">
            {setting.listening ? SHORTCUT_TEXTS.cancel : SHORTCUT_TEXTS.change}
          </Button>
        </div>
      )}
      {setting.warning && (
        <div role="alert" className="ml-12 flex flex-col gap-2 rounded-control border border-warn/40 bg-raised p-3">
          <p className="text-[12px] text-text">{setting.warning.message}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={setting.listen} className="h-8 px-3 text-[12px]">
              {SHORTCUT_TEXTS.chooseOther}
            </Button>
            <Button disabled={setting.saving} onClick={setting.saveAnyway} className="h-8 px-3 text-[12px]">
              {SHORTCUT_TEXTS.saveAnyway}
            </Button>
          </div>
        </div>
      )}
      {setting.error && <p role="alert" className="pl-12 text-[11px] text-lilac-soft">{setting.error}</p>}
    </div>
  );
};
