import { useMemo, useState } from 'react';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { SPACE_TEXTS } from '@/modules/space/constants/texts';
import type { SpaceItem } from '@/modules/space/interfaces/spaceView';
import { mapColor } from '@/modules/space/utils/colors';
import { treemap } from '@/modules/space/utils/treemap';

interface SpaceMapProps {
  items    : SpaceItem[];
  selected : number | null;
  onEnter  : (item: SpaceItem) => void;
  onSelect : (item: SpaceItem) => void;
}

const WIDTH  = 600;
const HEIGHT = 380;

// The map: every folder or file a rectangle of its size, in the colour of its kind. A folder is
// entered with a click; a file is chosen. The name and size show on the rectangle when they fit, and
// in a line under the map when the cursor is over it. The list beside it says the same for the keyboard
// and screen readers, so the map itself is only a picture for them.
export const SpaceMap = ({ items, selected, onEnter, onSelect }: SpaceMapProps) => {
  const [hover, setHover] = useState<SpaceItem | null>(null);
  const placed            = useMemo(() => treemap({ items, sizeOf: (item) => item.size, box: { x: 0, y: 0, width: WIDTH, height: HEIGHT } }), [items]);

  return (
    <div className="flex flex-col gap-1.5">
      <svg role="img" aria-label={SPACE_TEXTS.map} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full overflow-hidden rounded-control bg-bg" onPointerLeave={() => setHover(null)}>
        {placed.map((rect) => {
          const item  = rect.item;
          const label = rect.width > 70 && rect.height > 28;
          const color = mapColor(item.kind, item.share);
          return (
            <g key={item.id} className="cursor-pointer" onPointerEnter={() => setHover(item)} onClick={() => (item.dir ? onEnter(item) : onSelect(item))}>
              <rect
                x={rect.x + 1}
                y={rect.y + 1}
                width={Math.max(0, rect.width - 2)}
                height={Math.max(0, rect.height - 2)}
                rx={3}
                fill={color.fill}
                stroke={item.id === selected ? 'var(--color-text)' : 'transparent'}
                strokeWidth={2}
              />
              {label && (
                <text x={rect.x + 7} y={rect.y + 17} fill={color.text} className="pointer-events-none text-[12px] font-semibold">
                  {item.name.length > rect.width / 8 ? `${item.name.slice(0, Math.max(3, Math.floor(rect.width / 8) - 1))}…` : item.name}
                  <tspan x={rect.x + 7} dy={14} className="text-[11px] font-normal">{formatFileSize(item.size)}</tspan>
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p aria-hidden className="h-4 truncate text-[12px] text-muted">{hover ? `${hover.name} · ${formatFileSize(hover.size)}` : ''}</p>
    </div>
  );
};
