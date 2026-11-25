import { FILE_KINDS } from '@/modules/duplicates/constants/kinds';
import { DUPLICATES_TEXTS } from '@/modules/duplicates/constants/texts';
import type { FileKind } from '@/modules/duplicates/types/fileKind';
import { fileName } from '@/modules/duplicates/utils/filters';
import { cx } from '@/shared/utils/classNames';

interface DuplicatesFiltersProps {
  kind    : FileKind;
  root    : string | null;
  folders : string[];
  onKind  : (kind: FileKind) => void;
  onRoot  : (root: string | null) => void;
}

// By type (fotos, videos, documentos, otros) and by the folder searched.
export const DuplicatesFilters = ({ kind, root, folders, onKind, onRoot }: DuplicatesFiltersProps) => (
  <div className="flex flex-wrap items-center gap-2">
    <div role="radiogroup" aria-label={DUPLICATES_TEXTS.kindLabel} className="flex rounded-full border border-line bg-bg p-0.5">
      {FILE_KINDS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === kind}
          onClick={() => onKind(option)}
          className={cx('h-7 cursor-pointer rounded-full px-2.5 text-[11px] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-lilac', option === kind ? 'bg-raised text-text' : 'text-muted hover:text-text')}
        >
          {DUPLICATES_TEXTS.kinds[option]}
        </button>
      ))}
    </div>
    <select
      aria-label={DUPLICATES_TEXTS.folderLabel}
      value={root ?? ''}
      onChange={(event) => onRoot(event.target.value || null)}
      className="h-8 cursor-pointer rounded-control border border-line-strong bg-raised px-2 text-[12px] font-semibold text-text"
    >
      <option value="">{DUPLICATES_TEXTS.allFolders}</option>
      {folders.map((folder) => <option key={folder} value={folder}>{fileName(folder)}</option>)}
    </select>
  </div>
);
