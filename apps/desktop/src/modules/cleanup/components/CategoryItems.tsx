import { CategoryItemRow } from '@/modules/cleanup/components/CategoryItemRow';
import { ITEM_ROW_HEIGHT } from '@/modules/cleanup/constants/categories';
import { useVirtualRows } from '@/modules/cleanup/hooks/useVirtualRows';
import type { CleanupCategory } from '@/modules/cleanup/interfaces/cleanupCategory';
import { canMark } from '@/modules/cleanup/utils/selection';

interface CategoryItemsProps {
  category : CleanupCategory;
  selected : Set<string>;
  editable : boolean;
  onToggle : (path: string) => void;
  onReveal : (path: string) => void;
}

// Virtualized: only the rows in view exist, so tens of thousands of cache files stay smooth.
export const CategoryItems = ({ category, selected, editable, onToggle, onReveal }: CategoryItemsProps) => {
  const rows       = useVirtualRows(category.items.length);
  const selectable = category.method !== 'empty-recycle-bin';

  return (
    <div className="scroll-thin relative overflow-y-auto border-t border-line" style={{ height: rows.height }} onScroll={rows.onScroll}>
      <div className="relative" style={{ height: rows.total }}>
        {category.items.slice(rows.range.start, rows.range.end).map((item, offset) => (
          <CategoryItemRow
            key={item.path}
            item={item}
            top={(rows.range.start + offset) * ITEM_ROW_HEIGHT}
            height={ITEM_ROW_HEIGHT}
            selectable={selectable && editable}
            checked={selected.has(item.path)}
            locked={!canMark({ category, path: item.path, selected })}
            onToggle={onToggle}
            onReveal={onReveal}
          />
        ))}
      </div>
    </div>
  );
};
