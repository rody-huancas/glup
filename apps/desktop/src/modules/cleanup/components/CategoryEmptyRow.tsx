import { CATEGORY_TEXTS, CLEANUP_TEXTS } from '@/modules/cleanup/constants/texts';
import type { CategoryId } from '@/modules/cleanup/types/categoryId';

interface CategoryEmptyRowProps {
  id: CategoryId;
}

// A category with nothing: one compact line, no checkbox or chevron.
export const CategoryEmptyRow = ({ id }: CategoryEmptyRowProps) => (
  <div className="flex items-center justify-between gap-3 rounded-[14px] border border-line px-4 py-2.5">
    <span className="text-[13px] font-semibold text-text">{CATEGORY_TEXTS[id].name}</span>
    <span className="shrink-0 text-[12px] text-muted">{CLEANUP_TEXTS.nothingHere}</span>
  </div>
);
