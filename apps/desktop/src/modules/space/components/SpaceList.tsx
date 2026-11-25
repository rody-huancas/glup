import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { SPACE_TEXTS } from '@/modules/space/constants/texts';
import type { SpaceItem } from '@/modules/space/interfaces/spaceView';
import { mapColor } from '@/modules/space/utils/colors';
import { percentOf } from '@/modules/space/utils/treemap';
import { cx } from '@/shared/utils/classNames';

interface SpaceListProps {
  items    : SpaceItem[];
  total    : number;
  rest     : [number, number] | null;
  selected : number | null;
  onEnter  : (item: SpaceItem) => void;
  onSelect : (item: SpaceItem) => void;
}

// The same as the map, as a list from the biggest: a folder is entered, a file is chosen (both with Enter).
export const SpaceList = ({ items, total, rest, selected, onEnter, onSelect }: SpaceListProps) => (
  <ol aria-label={SPACE_TEXTS.list} className="flex flex-col gap-1">
    {items.map((item) => (
      <li key={item.id}>
        <button
          type="button"
          onClick={() => (item.dir ? onEnter(item) : onSelect(item))}
          aria-label={item.dir ? `${SPACE_TEXTS.enter(item.name)}, ${formatFileSize(item.size)}, ${SPACE_TEXTS.share(percentOf(item.size, total))}` : undefined}
          aria-pressed={!item.dir ? item.id === selected : undefined}
          className={cx('flex w-full cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-left outline-none hover:bg-raised focus-visible:ring-2 focus-visible:ring-fam-pc', item.id === selected && 'bg-raised')}
        >
          <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: mapColor(item.kind, item.share).fill }} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] text-text">{item.name}{item.dir && <span aria-hidden className="text-muted"> ›</span>}</span>
            {item.note && <span className="text-[11px] leading-4 text-muted">{item.note}</span>}
          </span>
          <span className="shrink-0 text-[12px] text-muted tabular-nums">{percentOf(item.size, total)}</span>
          <span className="w-20 shrink-0 text-right text-[12px] font-semibold text-text tabular-nums">{formatFileSize(item.size)}</span>
        </button>
      </li>
    ))}
    {rest && <li className="px-2 py-1 text-[12px] text-muted">{SPACE_TEXTS.rest(rest[0], formatFileSize(rest[1]))}</li>}
  </ol>
);
