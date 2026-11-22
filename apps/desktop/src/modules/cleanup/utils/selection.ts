import { MARKED_BY_DEFAULT, RECYCLE_BIN_KEY } from '@/modules/cleanup/constants/categories';
import type { CleanupCategory } from '@/modules/cleanup/interfaces/cleanupCategory';
import type { CleanupItem } from '@/modules/cleanup/interfaces/cleanupItem';
import type { SelectionTotals } from '@/modules/cleanup/interfaces/selectionTotals';
import type { CheckState } from '@/modules/cleanup/types/checkState';

interface ToggleItemParams {
  category : CleanupCategory;
  path     : string;
  selected : Set<string>;
}

// Copies of the same file, in the order Rust sent them (oldest first).
export const groupsOf = (items: CleanupItem[]): Map<number, CleanupItem[]> => {
  const groups = new Map<number, CleanupItem[]>();

  items.forEach((item) => {
    if (item.group === null) return;
    groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  });

  return groups;
};

// The copy that stays when a whole group is marked.
export const keptCopies = (category: CleanupCategory): Set<string> =>
  new Set([...groupsOf(category.items).values()].map((copies) => copies[0].path));

// Everything a category can mark at once: all of it, except one copy of each repeated file.
const markable = (category: CleanupCategory): string[] => {
  if (category.method === 'empty-recycle-bin') return category.total > 0 ? [RECYCLE_BIN_KEY] : [];

  const kept = keptCopies(category);
  return category.items.map((item) => item.path).filter((path) => !kept.has(path));
};

export const defaultSelection = (categories: CleanupCategory[]): Set<string> =>
  new Set(categories.filter((category) => MARKED_BY_DEFAULT.includes(category.id)).flatMap(markable));

export const categoryState = (category: CleanupCategory, selected: Set<string>): CheckState => {
  const keys   = category.method === 'empty-recycle-bin' ? markable(category) : category.items.map((item) => item.path);
  const marked = keys.filter((key) => selected.has(key)).length;
  const full   = markable(category).every((key) => selected.has(key));

  if (marked === 0) return 'none';
  return full ? 'all' : 'some';
};

// Marks what the category can mark (repeated files: all but the oldest copy), or clears it.
export const toggleCategory = (category: CleanupCategory, selected: Set<string>): Set<string> => {
  const next = new Set(selected);
  const keys = category.method === 'empty-recycle-bin' ? markable(category) : category.items.map((item) => item.path);

  if (categoryState(category, selected) === 'all') keys.forEach((key) => next.delete(key));
  else markable(category).forEach((key) => next.add(key));

  return next;
};

// Never every copy: marking the last unmarked copy of a group is refused.
export const canMark = ({ category, path, selected }: ToggleItemParams): boolean => {
  const item = category.items.find((candidate) => candidate.path === path);
  if (!item || item.group === null || selected.has(path)) return true;

  const copies = groupsOf(category.items).get(item.group) ?? [];
  return copies.some((copy) => copy.path !== path && !selected.has(copy.path));
};

export const toggleItem = (params: ToggleItemParams): Set<string> => {
  const next = new Set(params.selected);

  if (next.has(params.path)) next.delete(params.path);
  else if (canMark(params)) next.add(params.path);

  return next;
};

export const selectionTotals = (categories: CleanupCategory[], selected: Set<string>): SelectionTotals => {
  const totals: SelectionTotals = { trash: 0, direct: 0, bin: 0, total: 0, files: 0 };

  categories.forEach((category) => {
    if (category.method === 'empty-recycle-bin') {
      if (selected.has(RECYCLE_BIN_KEY)) totals.bin += category.total;
      return;
    }

    category.items
      .filter((item) => selected.has(item.path))
      .forEach((item) => {
        totals.files += 1;
        if (category.method === 'trash') totals.trash += item.size;
        else totals.direct += item.size;
      });
  });

  totals.total = totals.trash + totals.direct + totals.bin;
  return totals;
};

// The paths to send to Rust (it checks them again and keeps one copy of each file anyway).
export const selectedPaths = (categories: CleanupCategory[], selected: Set<string>): string[] =>
  categories.filter((category) => category.method !== 'empty-recycle-bin').flatMap((category) => category.items.map((item) => item.path).filter((path) => selected.has(path)));
