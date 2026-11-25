import { DOCK_SPOTS } from '@/modules/dock/constants/dock';
import { DOCK_SPOT_LABELS } from '@/modules/dock/constants/texts';
import type { IslandDock } from '@/modules/dock/interfaces/islandDock';
import type { DockEdge } from '@/modules/dock/types/dockEdge';
import { cx } from '@/shared/utils/classNames';

interface DockSpotsProps {
  dock     : IslandDock;
  onChoose : (edge: DockEdge) => void;
}

const percent = (share: number): string => `${share * 100}%`;

// The eight spots of the drawing of Ajustes, as buttons for the keyboard (the pill's edges and corners).
export const DockSpots = ({ dock, onChoose }: DockSpotsProps) => (
  <>
    {DOCK_SPOTS.map((spot) => {
      const current = dock.edge === spot.edge && (spot.edge.includes('-') || Math.abs(dock.offset - 0.5) < 0.01);

      return (
        <button
          key={spot.edge}
          type="button"
          aria-label={DOCK_SPOT_LABELS[spot.edge]}
          aria-pressed={current}
          title={DOCK_SPOT_LABELS[spot.edge]}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onChoose(spot.edge);
          }}
          className={cx(
            'absolute size-3 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border transition-colors',
            current ? 'border-mint bg-mint' : 'border-line-strong bg-raised hover:border-lilac hover:bg-lilac',
          )}
          style={{ left: percent(spot.x), top: percent(spot.y) }}
        />
      );
    })}
  </>
);
