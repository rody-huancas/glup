import { useId } from 'react';
import { FOLDER_SORT_TEXTS, SKIP_REASON_TEXTS } from '@/modules/folder-sort/constants/texts';
import type { SkippedFile } from '@/modules/folder-sort/interfaces/skippedFile';
import { countReasons, visibleFiles } from '@/modules/folder-sort/utils/sortView';
import { ChevronDownIcon } from '@/shared/icons/ChevronDownIcon';
import { cx } from '@/shared/utils/classNames';

interface SortSkippedListProps {
  skipped  : SkippedFile[];
  expanded : boolean;
  onToggle : () => void;
}

// What stays where it is, counted by reason, and open, each file with its reason.
export const SortSkippedList = ({ skipped, expanded, onToggle }: SortSkippedListProps) => {
  const listId           = useId();
  const counts           = countReasons(skipped);
  const { shown, hidden } = visibleFiles(skipped);

  if (skipped.length === 0) return null;

  return (
    <section className="rounded-[14px] border border-line">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors hover:bg-raised"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-text">{FOLDER_SORT_TEXTS.skipped(skipped.length)}</span>
          <span className="block truncate text-xs text-muted">{counts.map((item) => `${item.count} · ${item.label}`).join('   ')}</span>
        </span>
        <ChevronDownIcon className={cx('size-4 text-muted transition-transform motion-reduce:transition-none', expanded && 'rotate-180')} />
      </button>
      {expanded && (
        <ul id={listId} className="flex flex-col gap-0.5 px-3 pb-2.5">
          {shown.map((file) => (
            <li key={file.name} className="flex gap-3 text-xs">
              <span className="min-w-0 flex-1 truncate text-text">{file.name}</span>
              <span className="shrink-0 text-muted">{SKIP_REASON_TEXTS[file.reason]}</span>
            </li>
          ))}
          {hidden > 0 && <li className="text-xs text-muted">{FOLDER_SORT_TEXTS.more(hidden)}</li>}
        </ul>
      )}
    </section>
  );
};
