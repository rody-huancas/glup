import { useId } from 'react';
import type { MouseEvent } from 'react';
import { DockSpots } from '@/modules/dock/components/DockSpots';
import { DOCK_TEXTS } from '@/modules/dock/constants/texts';
import { useDockSetting } from '@/modules/dock/hooks/useDockSetting';
import { spotAt } from '@/modules/dock/utils/bubble';
import { bubbleOnScreen, drawingPoint, pillOnScreen } from '@/modules/dock/utils/dockPreview';
import { dockAt, workSize } from '@/modules/dock/utils/snapDock';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { cx } from '@/shared/utils/classNames';

const percent = (share: number): string => `${share * 100}%`;

// Ajustes › General: a small drawing of the screen with Glup where it is. A click anywhere on it puts
// Glup at the nearest edge or corner (as dropping it there would), or the bubble right there; the eight
// spots are buttons for the keyboard. With more than one screen, which one; and the way back to the top
// in the middle (the bubble: to the middle of the main screen).
export const DockPositionSetting = () => {
  const setting  = useDockSetting();
  const bubble   = setting.rest === 'bubble';
  const place    = bubble ? setting.bubble : setting.resolved;
  const screenId = useId();

  if (!place || !setting.resolved) return setting.failed ? <p className="text-[11px] text-lilac-soft">{DOCK_TEXTS.failed}</p> : <Skeleton className="h-24 w-72" />;

  const { dock }   = setting.resolved;
  const { screen } = place;
  const work       = workSize(screen);
  const mark       = setting.bubble && bubble ? bubbleOnScreen(setting.bubble.spot, work) : pillOnScreen(dock, work);

  // A mouse convenience on top of the spot buttons: the exact spot where it was clicked.
  const onDrawingClick = (event: MouseEvent<HTMLDivElement>) => {
    const box   = event.currentTarget.getBoundingClientRect();
    const share = { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height };
    const point = drawingPoint(share, work);

    if (bubble) setting.chooseSpot(spotAt(point, work, screen.id));
    else setting.choose(dockAt(point, work, screen.id));
  };

  const onScreenChange = (id: string) => {
    if (bubble && setting.bubble) setting.chooseSpot({ ...setting.bubble.spot, screen: id });
    else setting.choose({ ...dock, screen: id });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <span className="flex flex-col">
        <span className="text-[11px] leading-5 font-semibold text-text">{DOCK_TEXTS.title}</span>
        <span className="text-[11px] leading-4 text-muted">{bubble ? DOCK_TEXTS.bubbleHint : DOCK_TEXTS.hint}</span>
      </span>
      <div className="flex items-center gap-5 pl-1">
        <div
          role="group"
          aria-label={bubble ? DOCK_TEXTS.bubbleDrawing : DOCK_TEXTS.drawing}
          onClick={onDrawingClick}
          className="relative w-[180px] shrink-0 cursor-pointer rounded-md border border-line-strong bg-bg"
          style={{ aspectRatio: `${work.width} / ${work.height}` }}
        >
          <span
            aria-hidden
            className={cx(
              'pointer-events-none absolute min-h-1.5 min-w-1.5 bg-mint transition-[left,top] duration-150 motion-reduce:transition-none',
              bubble ? 'size-2 -translate-x-1/2 -translate-y-1/2 rounded-full' : 'rounded-sm',
            )}
            style={bubble
              ? { left: percent(mark.x + mark.width / 2), top: percent(mark.y + mark.height / 2) }
              : { left: percent(mark.x), top: percent(mark.y), width: percent(mark.width), height: percent(mark.height) }}
          />
          {!bubble && <DockSpots dock={dock} onChoose={(edge) => setting.choose({ edge, offset: 0.5, screen: screen.id })} />}
        </div>
        <div className="flex flex-col gap-2">
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
          <Button variant="secondary" onClick={setting.reset} className="h-8 px-3 text-[12px]">
            {bubble ? DOCK_TEXTS.bubbleReset : DOCK_TEXTS.reset}
          </Button>
        </div>
      </div>
      {setting.failed && <p role="alert" className="text-[11px] text-lilac-soft">{DOCK_TEXTS.failed}</p>}
    </div>
  );
};
