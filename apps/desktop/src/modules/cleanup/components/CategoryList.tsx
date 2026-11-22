import { CategoryCard } from '@/modules/cleanup/components/CategoryCard';
import { CategoryEmptyRow } from '@/modules/cleanup/components/CategoryEmptyRow';
import { CategorySkeleton } from '@/modules/cleanup/components/CategorySkeleton';
import type { CleanupCategory } from '@/modules/cleanup/interfaces/cleanupCategory';
import type { CategoryId } from '@/modules/cleanup/types/categoryId';
import type { DisplayOrder } from '@/modules/cleanup/utils/displayOrder';

interface CategoryListProps {
  order        : DisplayOrder;
  selected     : Set<string>;
  expanded     : Set<CategoryId>;
  editable     : boolean;
  onToggle     : (category: CleanupCategory) => void;
  onExpand     : (id: CategoryId) => void;
  onToggleItem : (category: CleanupCategory, path: string) => void;
  onReveal     : (path: string) => void;
}

// What was found first, then the ones still being checked, then the empty ones in one line each.
export const CategoryList = ({ order, selected, expanded, editable, onToggle, onExpand, onToggleItem, onReveal }: CategoryListProps) => (
  <div className="flex flex-col gap-2">
    {order.found.map((category) => (
      <CategoryCard
        key={category.id}
        category={category}
        selected={selected}
        expanded={expanded.has(category.id)}
        editable={editable}
        onToggle={onToggle}
        onExpand={() => onExpand(category.id)}
        onToggleItem={onToggleItem}
        onReveal={onReveal}
      />
    ))}
    {order.pending.map((id) => <CategorySkeleton key={id} id={id} />)}
    {order.empty.map((category) => <CategoryEmptyRow key={category.id} id={category.id} />)}
  </div>
);
