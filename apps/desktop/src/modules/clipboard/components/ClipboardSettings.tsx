import { useId } from 'react';
import { TurnOffDialog } from '@/modules/clipboard/components/TurnOffDialog';
import { LIMIT_OPTIONS } from '@/modules/clipboard/constants/clipboard';
import { CLIPBOARD_SETTINGS_TEXTS } from '@/modules/clipboard/constants/texts';
import { useClipboardSettings } from '@/modules/clipboard/hooks/useClipboardSettings';
import { ShortcutSetting } from '@/modules/shortcuts/components/ShortcutSetting';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { IconButton } from '@/shared/components/IconButton';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { Skeleton } from '@/shared/components/Skeleton';
import { Switch } from '@/shared/components/Switch';
import { CloseIcon } from '@/shared/icons/CloseIcon';

// Ajustes › Portapapeles: on or off, the limit, the excluded programs and its shortcut.
export const ClipboardSettings = () => {
  const settings = useClipboardSettings();
  const status   = settings.status;
  const limitId  = useId();
  const listId   = useId();

  return (
    <section className="flex flex-col gap-2.5">
      <SectionLabel>{CLIPBOARD_SETTINGS_TEXTS.title}</SectionLabel>
      <Card className="flex flex-col gap-3.5 p-3.5">
        {!status && <Skeleton className="h-9 w-72" />}
        {status && (
          <>
            <Switch
              label={CLIPBOARD_SETTINGS_TEXTS.enabled}
              hint={status.enabled ? CLIPBOARD_SETTINGS_TEXTS.enabledHint : CLIPBOARD_SETTINGS_TEXTS.disabledHint}
              checked={status.enabled}
              disabled={!status.supported}
              onChange={settings.turnOff.setEnabled}
            />
            <div className="border-t border-line" />
            <div className="flex items-center justify-between gap-4">
              <span className="flex flex-col">
                <label htmlFor={limitId} className="text-[11px] leading-5 font-semibold text-text">{CLIPBOARD_SETTINGS_TEXTS.limit}</label>
                <span className="text-[11px] leading-4 text-muted">{CLIPBOARD_SETTINGS_TEXTS.limitHint}</span>
              </span>
              <select
                id={limitId}
                value={status.limit}
                onChange={(event) => settings.setLimit(Number(event.target.value))}
                className="h-9 cursor-pointer rounded-control border border-line-strong bg-raised px-3 text-[12px] font-semibold text-text"
              >
                {LIMIT_OPTIONS.map((option) => <option key={option} value={option}>{CLIPBOARD_SETTINGS_TEXTS.limitOption(option)}</option>)}
              </select>
            </div>
            <div className="border-t border-line" />
            <div className="flex flex-col gap-2">
              <span className="flex flex-col">
                <span id={listId} className="text-[11px] leading-5 font-semibold text-text">{CLIPBOARD_SETTINGS_TEXTS.excluded}</span>
                <span className="text-[11px] leading-4 text-muted">{CLIPBOARD_SETTINGS_TEXTS.excludedHint}</span>
              </span>
              {status.excluded.length === 0 ? (
                <p className="text-[12px] text-muted">{CLIPBOARD_SETTINGS_TEXTS.noExcluded}</p>
              ) : (
                <ul aria-labelledby={listId} className="flex flex-wrap gap-2">
                  {status.excluded.map((name) => (
                    <li key={name} className="flex items-center gap-1 rounded-full border border-line-strong bg-raised py-0.5 pl-3 pr-1 text-[12px] font-semibold text-text">
                      {name}
                      <IconButton icon={CloseIcon} label={CLIPBOARD_SETTINGS_TEXTS.removeProgram(name)} onClick={() => settings.removeOne(name)} className="size-6 rounded-full" iconClass="size-3" />
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="secondary" onClick={settings.addOne} className="h-8 w-fit px-3 text-[12px]">
                {CLIPBOARD_SETTINGS_TEXTS.addProgram}
              </Button>
            </div>
            <div className="border-t border-line" />
            <ShortcutSetting target="clipboard" />
          </>
        )}
        {settings.failed && <p role="alert" className="text-[11px] text-lilac-soft">{CLIPBOARD_SETTINGS_TEXTS.failed}</p>}
      </Card>
      {settings.turnOff.asking && <TurnOffDialog count={settings.turnOff.count} onKeep={settings.turnOff.keep} onDeleteAll={settings.turnOff.deleteAll} onDismiss={settings.turnOff.dismiss} />}
    </section>
  );
};
