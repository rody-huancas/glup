import { PlacementItem } from '@/modules/sign/components/PlacementItem';
import type { PlacementActions } from '@/modules/sign/components/PlacementItem';
import type { Size } from '@/modules/sign/interfaces/geometry';
import type { SignPlacement } from '@/modules/sign/interfaces/placement';

interface PlacementLayerProps {
  placements : SignPlacement[];
  view       : Size;
  selectedId : string | null;
  editingId  : string | null;
  actions    : PlacementActions;
  onClear    : () => void;
}

// Over the rendered page, same size; a press on the empty page drops the selection.
export const PlacementLayer = ({ placements, view, selectedId, editingId, actions, onClear }: PlacementLayerProps) => (
  <div className="absolute inset-0" onPointerDown={(event) => event.target === event.currentTarget && onClear()}>
    {placements.map((placement) => (
      <PlacementItem
        key={placement.id}
        placement={placement}
        view={view}
        selected={placement.id === selectedId}
        editing={placement.id === editingId}
        actions={actions}
      />
    ))}
  </div>
);
