import { useId } from 'react';
import type { MouseEvent } from 'react';
import { DOCK_SPOTS } from '@/modules/dock/constants/dock';
import { DOCK_SPOT_LABELS, DOCK_TEXTS } from '@/modules/dock/constants/texts';
import { useDockSetting } from '@/modules/dock/hooks/useDockSetting';
import { drawingPoint, pillOnScreen } from '@/modules/dock/utils/dockPreview';
import { dockAt, workSize } from '@/modules/dock/utils/snapDock';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { cx } from '@/shared/utils/classNames';

const percent = (share: number): string => `${share * 100}%`;

// Ajustes › General: a small drawing of the screen with Glup where it is. A click anywhere on it puts
// Glup at the nearest edge or corner (as dropping it there would); the eight spots are buttons for the
// keyboard. With more than one screen, which one; and the way back to the top in the middle.
export const DockPositionSetting = () => {
  const setting  = useDockSetting();
  const resolved = setting.resolved;
  const screenId = useId();

  if (!resolved) return setting.failed ? <p className="text-[11px] text-lilac-soft">{DOCK_TEXTS.failed}</p> : <Skeleton className="h-24 w-72" />;

  const { dock, screen } = resolved;
  const work             = workSize(screen);
  const pill             = pillOnScreen(dock, work);

  // A mouse convenience on top of the spot buttons: the exact spot where it was clicked.
  const onDrawingClick = (event: MouseEvent<HTMLDivElement>) => {
    const box   = event.currentTarget.getBoundingClientRect();
    const share = { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height };
    setting.choose(dockAt(drawingPoint(share, work), work, screen.id));
  };

  return (
    <div className="flex flex-col gap-2.5">
      <span className="flex flex-col">
        <span className="text-[11px] leading-5 font-semibold text-text">{DOCK_TEXTS.title}</span>
        <span className="text-[11px] leading-4 text-muted">{DOCK_TEXTS.hint}</span>
      </span>
      <div className="flex items-center gap-5 pl-1">
        <div
          role="group"
          aria-label={DOCK_TEXTS.drawing}
          onClick={onDrawingClick}
          className="relative w-[180px] shrink-0 cursor-pointer rounded-md border border-line-strong bg-bg"
          style={{ aspectRatio: `${work.width} / ${work.height}` }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute min-h-1.5 min-w-1.5 rounded-sm bg-mint transition-[left,top] duration-150 motion-reduce:transition-none"
            style={{ left: percent(pill.x), top: percent(pill.y), width: percent(pill.width), height: percent(pill.height) }}
          />
          {DOCK_SPOTS.map((spot) => {
            const current = dock.edge === spot.edge && (spot.edge.includes('-') || Math.abs(dock.offset - 0.5) < 0.01);

            return (
              <button
                key={spot.edge}
                type="button"
                aria-label={DOCK_SPOT_LABELS[spot.edge]}
                aria-pressed={current}
                title={DOCK_SPOT_LABELS[spot.edge]}
                onClick={(event) => {
                  event.stopPropagation();
                  setting.choose({ edge: spot.edge, offset: 0.5, screen: screen.id });
                }}
                className={cx(
                  'absolute size-3 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border transition-colors',
                  current ? 'border-mint bg-mint' : 'border-line-strong bg-raised hover:border-lilac hover:bg-lilac',
                )}
                style={{ left: percent(spot.x), top: percent(spot.y) }}
              />
            );
          })}
        </div>
        <div className="flex flex-col gap-2">
          {setting.screens.length > 1 && (
            <label htmlFor={screenId} className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
              {DOCK_TEXTS.screen}
              <select
                id={screenId}
                value={screen.id}
                onChange={(event) => setting.choose({ ...dock, screen: event.target.value })}
                className="h-8 cursor-pointer rounded-control border border-line-strong bg-raised px-2 text-[12px] font-semibold text-text"
              >
                {setting.screens.map((option, index) => <option key={option.id} value={option.id}>{DOCK_TEXTS.screenName(index, option.primary)}</option>)}
              </select>
            </label>
          )}
          <Button variant="secondary" onClick={setting.reset} className="h-8 px-3 text-[12px]">
            {DOCK_TEXTS.reset}
          </Button>
        </div>
      </div>
      {setting.failed && <p role="alert" className="text-[11px] text-lilac-soft">{DOCK_TEXTS.failed}</p>}
    </div>
  );
};
