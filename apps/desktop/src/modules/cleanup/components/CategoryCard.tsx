import { CategoryItems } from '@/modules/cleanup/components/CategoryItems';
import { CATEGORY_TEXTS, CLEANUP_TEXTS } from '@/modules/cleanup/constants/texts';
import type { CleanupCategory } from '@/modules/cleanup/interfaces/cleanupCategory';
import { categoryState } from '@/modules/cleanup/utils/selection';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { Card } from '@/shared/components/Card';
import { Checkbox } from '@/shared/components/Checkbox';
import { ChevronDownIcon } from '@/shared/icons/ChevronDownIcon';
import { cx } from '@/shared/utils/classNames';

interface CategoryCardProps {
  category       : CleanupCategory;
  selected       : Set<string>;
  expanded       : boolean;
  // Marks can change only once the scan is done.
  editable       : boolean;
  onToggle       : (category: CleanupCategory) => void;
  onExpand       : () => void;
  onToggleItem   : (category: CleanupCategory, path: string) => void;
  onReveal       : (path: string) => void;
}

export const CategoryCard = ({ category, selected, expanded, editable, onToggle, onExpand, onToggleItem, onReveal }: CategoryCardProps) => {
  const text  = CATEGORY_TEXTS[category.id];
  const state = categoryState(category, selected);
  const note  = category.running.length > 0 ? CLEANUP_TEXTS.running(category.running) : category.method === 'empty-recycle-bin' ? CLEANUP_TEXTS.wholeBin : null;

  return (
    <Card className="overflow-hidden">
      <div className="flex min-h-16 items-center gap-3 px-4 py-3">
        <Checkbox
          label={CLEANUP_TEXTS.mark(text.name)}
          checked={state === 'all'}
          indeterminate={state === 'some'}
          disabled={!editable}
          onChange={() => onToggle(category)}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-snug text-text">{text.name}</p>
          <p className="text-[12px] leading-snug text-muted">{text.hint}</p>
          {note && <p className="mt-0.5 text-[12px] leading-snug text-warn">{note}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="whitespace-nowrap text-[14px] font-semibold leading-snug text-text">{formatFileSize(category.total)}</p>
          <p className="whitespace-nowrap text-[12px] leading-snug text-muted">{CLEANUP_TEXTS.found(category.count)}</p>
        </div>
        {category.items.length > 0 && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? CLEANUP_TEXTS.collapse : CLEANUP_TEXTS.expand}
            onClick={onExpand}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-muted transition-colors hover:bg-line hover:text-text"
          >
            <ChevronDownIcon className={cx('size-4 transition-transform motion-reduce:transition-none', expanded && 'rotate-180')} />
          </button>
        )}
      </div>
      {expanded && (
        <CategoryItems
          category={category}
          selected={selected}
          editable={editable}
          onToggle={(path) => onToggleItem(category, path)}
          onReveal={onReveal}
        />
      )}
    </Card>
  );
};
