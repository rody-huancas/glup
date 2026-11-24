import { useId } from 'react';
import { LookOption } from '@/modules/dock/components/LookOption';
import { REVEAL_DELAYS } from '@/modules/dock/constants/dock';
import { LOOK_TEXTS } from '@/modules/dock/constants/texts';
import { useIslandLook } from '@/modules/dock/hooks/useIslandLook';
import type { DockEdge } from '@/modules/dock/types/dockEdge';
import { competesWithTaskbar } from '@/modules/dock/utils/reveal';
import { ShortcutSetting } from '@/modules/shortcuts/components/ShortcutSetting';
import { useShortcutView } from '@/modules/shortcuts/hooks/useShortcutView';
import { shortcutKeys } from '@/modules/shortcuts/utils/shortcut';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Skeleton } from '@/shared/components/Skeleton';

interface IslandLookSettingProps {
  // The edge Glup is on (to warn about a taskbar that hides there).
  edge: DockEdge;
}

// Ajustes › General, next to "Posición de Glup": the island as always or hidden (modo oculto), with the
// delay before it comes out, its shortcut and a warning if the taskbar hides on the same edge.
export const IslandLookSetting = ({ edge }: IslandLookSettingProps) => {
  const look     = useIslandLook();
  const shortcut = useShortcutView('island').view;
  const titleId  = useId();
  const delayId  = useId();

  if (look.hidden === null) return look.failed ? <p className="text-[11px] text-lilac-soft">{LOOK_TEXTS.failed}</p> : <Skeleton className="h-16 w-80" />;

  const keys = shortcut?.enabled ? shortcutKeys(shortcut.shortcut).join('+') : null;

  return (
    <div className="flex flex-col gap-2.5">
      <span id={titleId} className="text-[11px] leading-5 font-semibold text-text">{LOOK_TEXTS.title}</span>
      <div role="radiogroup" aria-labelledby={titleId} className="flex max-w-[460px] gap-2">
        <LookOption label={LOOK_TEXTS.island} hint={LOOK_TEXTS.islandHint} selected={!look.hidden} onChoose={() => look.choose(false)} />
        <LookOption label={LOOK_TEXTS.hidden} hint={LOOK_TEXTS.hiddenHint} selected={look.hidden} onChoose={() => look.choose(true)} />
      </div>
      {look.hidden && (
        <div className="flex items-center justify-between gap-4 pl-1">
          <span className="flex flex-col">
            <label htmlFor={delayId} className="text-[11px] leading-5 font-semibold text-text">{LOOK_TEXTS.delay}</label>
            <span className="text-[11px] leading-4 text-muted">{LOOK_TEXTS.delayHint}</span>
          </span>
          <select
            id={delayId}
            value={look.delay}
            onChange={(event) => look.setDelay(Number(event.target.value))}
            className="h-8 cursor-pointer rounded-control border border-line-strong bg-raised px-2 text-[12px] font-semibold text-text"
          >
            {REVEAL_DELAYS.map((ms) => <option key={ms} value={ms}>{LOOK_TEXTS.delayOption(ms)}</option>)}
          </select>
        </div>
      )}
      {look.hidden && competesWithTaskbar(edge, look.taskbar) && (
        <p role="note" className="rounded-control border border-warn/40 bg-raised px-3 py-2 text-[11px] leading-4 text-warn">{LOOK_TEXTS.taskbar}</p>
      )}
      <ShortcutSetting target="island" />
      {look.failed && <p role="alert" className="text-[11px] text-lilac-soft">{LOOK_TEXTS.failed}</p>}
      {look.intro && (
        <ConfirmDialog
          title={LOOK_TEXTS.introTitle}
          body={LOOK_TEXTS.introBody(keys)}
          cancel={LOOK_TEXTS.introKeep}
          confirm={LOOK_TEXTS.introOk}
          onCancel={look.backToIsland}
          onConfirm={look.understood}
          onDismiss={look.understood}
        />
      )}
    </div>
  );
};
