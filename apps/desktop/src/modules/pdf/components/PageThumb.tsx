import { THUMBNAIL_HEIGHTS } from '@/modules/pdf/constants/pdf';
import { FileThumb } from '@/modules/pdf/components/FileThumb';
import { cx } from '@/shared/utils/classNames';

interface PageThumbProps {
  path     : string;
  page     : number;
  // Position in the new PDF (1-based), or 0 when not chosen.
  position : number;
  onToggle : (page: number) => void;
}

export const PageThumb = ({ path, page, position, onToggle }: PageThumbProps) => (
  <button
    type="button"
    aria-pressed={position > 0}
    onClick={() => onToggle(page)}
    className={cx(
      'relative flex cursor-pointer flex-col items-center gap-1 rounded-control border p-1.5 transition-colors',
      position > 0 ? 'border-mint bg-[#24302E]' : 'border-line bg-raised hover:border-line-strong',
    )}
  >
    <FileThumb path={path} kind="pdf" page={page} height={THUMBNAIL_HEIGHTS.pages} className="w-full" />
    <span className="text-[11px] font-semibold text-muted">{page}</span>
    {position > 0 && (
      <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-mint text-[10px] font-bold text-mint-ink">
        {position}
      </span>
    )}
  </button>
);
