import { useId } from 'react';
import type { KeyboardEvent } from 'react';
import { DockSpots } from '@/modules/dock/components/DockSpots';
import { DOCK_TEXTS } from '@/modules/dock/constants/texts';
import { useDeferredDock } from '@/modules/dock/hooks/useDeferredDock';
import { useDockDrag } from '@/modules/dock/hooks/useDockDrag';
import { useDockSetting } from '@/modules/dock/hooks/useDockSetting';
import { bubbleOnScreen, pillOnScreen } from '@/modules/dock/utils/dockPreview';
import { dockLabel, isCorner, nudgeDock, offsetPercent, withOffset } from '@/modules/dock/utils/dockNudge';
import { workSize } from '@/modules/dock/utils/snapDock';
import { logPosition } from '@/modules/island/utils/islandLog';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { cx } from '@/shared/utils/classNames';

const percent = (share: number): string => `${share * 100}%`;

// Ajustes › General: a small drawing of the screen with Glup where it is. Its marker drags to any point of
// any edge or to a corner (as dragging the pill would; the bubble, anywhere), a click puts it there, and
// the arrows move it along its edge. «Posición en el borde» fine-tunes it from 0 to 100 %. While the
// marker or the slider is held down only the marker moves ("Arriba · 35 %" under the drawing): no
// settings, no window, no region. The island moves once, on release (the arrows: after a short pause). The eight spots are quick buttons. With more than one screen, which one; and the
// way back.
export const DockPositionSetting = () => {
  const setting  = useDockSetting();
  const bubble   = setting.rest === 'bubble';
  const place    = bubble ? setting.bubble : setting.resolved;
  const screenId = useId();
  const sliderId = useId();
  const work     = place ? workSize(place.screen) : { width: 16, height: 9 };
  const deferred = useDeferredDock(setting.choose);
  const drag     = useDockDrag({
    bubble,
    work,
    screen : place?.screen.id ?? '',
    onDock : (next) => {
      deferred.cancel();
      setting.choose(next);
    },
    onSpot : setting.chooseSpot,
  });

  if (!place || !setting.resolved) return setting.failed ? <p className="text-[11px] text-lilac-soft">{DOCK_TEXTS.failed}</p> : <Skeleton className="h-24 w-72" />;

  const { screen } = place;
  const dock       = drag.preview?.dock ?? deferred.pending ?? setting.resolved.dock;
  const spot       = drag.preview?.spot ?? setting.bubble?.spot ?? null;
  const mark       = bubble && spot ? bubbleOnScreen(spot, work) : pillOnScreen(dock, work);
  const corner     = isCorner(dock.edge);
  const dragging   = drag.preview !== null;
  const moving     = dragging || deferred.pending !== null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (bubble) return;
    const next = nudgeDock({ dock, key: event.key, big: event.shiftKey });
    if (!next) return;
    event.preventDefault();
    deferred.hold(next);
  };

  const onScreenChange = (id: string) => {
    if (bubble && setting.bubble) setting.chooseSpot({ ...setting.bubble.spot, screen: id });
    else {
      deferred.cancel();
      setting.choose({ ...dock, screen: id });
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <span className="flex flex-col">
        <span className="text-[11px] leading-5 font-semibold text-text">{DOCK_TEXTS.title}</span>
        <span className="text-[11px] leading-4 text-muted">{bubble ? DOCK_TEXTS.bubbleHint : DOCK_TEXTS.hint}</span>
      </span>
      <div className="flex items-start gap-5 pl-1">
        <div className="flex shrink-0 flex-col gap-1.5">
          <div
            role="group"
            tabIndex={0}
            aria-label={bubble ? DOCK_TEXTS.bubbleDrawing : DOCK_TEXTS.drawing}
            aria-describedby={bubble ? undefined : sliderId}
            onKeyDown={onKeyDown}
            {...drag.handlers}
            className={cx(
              'relative w-[220px] shrink-0 touch-none rounded-md border border-line-strong bg-bg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lilac',
              dragging ? 'cursor-grabbing' : 'cursor-pointer',
            )}
            style={{ aspectRatio: `${work.width} / ${work.height}` }}
          >
            <span
              aria-hidden
              className={cx(
                'pointer-events-none absolute min-h-1.5 min-w-1.5 bg-mint motion-reduce:transition-none',
                bubble ? 'size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full' : 'rounded-sm',
                !dragging && 'transition-[left,top,width,height] duration-150',
              )}
              style={bubble
                ? { left: percent(mark.x + mark.width / 2), top: percent(mark.y + mark.height / 2) }
                : { left: percent(mark.x), top: percent(mark.y), width: percent(mark.width), height: percent(mark.height) }}
            />
            {!bubble && (
              <DockSpots
                dock={dock}
                onChoose={(edge) => {
                  deferred.cancel();
                  setting.choose({ edge, offset: 0.5, screen: screen.id });
                }}
              />
            )}
          </div>
          <p aria-live="polite" className={cx('h-4 text-center text-[11px] font-semibold tabular-nums text-mint', !moving && 'invisible')}>
            {moving && !bubble ? dockLabel(dock) : ''}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-2.5">
          {!bubble && (
            <label htmlFor={sliderId} className="flex w-52 flex-col gap-1 text-[11px] font-semibold text-muted">
              <span className="flex justify-between">
                {DOCK_TEXTS.offset}
                <span className="tabular-nums text-text">{corner ? DOCK_TEXTS.inCorner : `${offsetPercent(dock)} %`}</span>
              </span>
              <input
                id={sliderId}
                type="range"
                min={0}
                max={100}
                step={1}
                disabled={corner}
                value={offsetPercent(dock)}
                aria-valuetext={corner ? DOCK_TEXTS.inCorner : `${offsetPercent(dock)} %`}
                onPointerDown={deferred.press}
                onChange={(event) => {
                  logPosition(`deslizador: ${event.target.value} %`);
                  deferred.hold(withOffset(dock, Number(event.target.value)));
                }}
                onBlur={deferred.release}
                className="w-full cursor-pointer accent-mint disabled:cursor-default disabled:opacity-40"
              />
            </label>
          )}
          {setting.screens.length > 1 && (
            <label htmlFor={screenId} className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
              {DOCK_TEXTS.screen}
              <select
                id={screenId}
                value={screen.id}
                onChange={(event) => onScreenChange(event.target.value)}
                className="h-8 cursor-pointer rounded-control border border-line-strong bg-raised px-2 text-[12px] font-semibold text-text"
              >
                {setting.screens.map((option, index) => <option key={option.id} value={option.id}>{DOCK_TEXTS.screenName(index, option.primary)}</option>)}
              </select>
            </label>
          )}
          <Button variant="secondary" onClick={setting.reset} className="h-8 self-start px-3 text-[12px]">
            {bubble ? DOCK_TEXTS.bubbleReset : DOCK_TEXTS.reset}
          </Button>
        </div>
      </div>
      {setting.failed && <p role="alert" className="text-[11px] text-lilac-soft">{DOCK_TEXTS.failed}</p>}
    </div>
  );
};
