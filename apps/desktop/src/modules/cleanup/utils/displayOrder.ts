import { CATEGORY_ORDER } from '@/modules/cleanup/constants/categories';
import type { CleanupCategory } from '@/modules/cleanup/interfaces/cleanupCategory';
import type { CategoryId } from '@/modules/cleanup/types/categoryId';

export interface DisplayOrder {
  // Categories with something, in the order they are checked.
  found   : CleanupCategory[];
  // Still being checked (a skeleton each).
  pending : CategoryId[];
  // Checked and empty: one compact line each, at the end.
  empty   : CleanupCategory[];
}

export const displayOrder = (categories: CleanupCategory[], scanning: boolean): DisplayOrder => {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const all  = CATEGORY_ORDER.map((id) => byId.get(id)).filter((category): category is CleanupCategory => category !== undefined);

  return {
    found   : all.filter((category) => category.total > 0),
    pending : scanning ? CATEGORY_ORDER.filter((id) => !byId.has(id)) : [],
    empty   : all.filter((category) => category.total === 0),
  };
};
