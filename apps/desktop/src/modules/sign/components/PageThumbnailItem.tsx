import { useEffect, useRef } from 'react';
import { FileThumb } from '@/modules/pdf/components/FileThumb';
import { SIGN_TEXTS, THUMBNAIL_HEIGHT } from '@/modules/sign/constants/sign';
import { cx } from '@/shared/utils/classNames';

interface PageThumbnailItemProps {
  path     : string;
  page     : number;
  total    : number;
  active   : boolean;
  // Something is placed on this page.
  marked   : boolean;
  onSelect : (page: number) => void;
}

export const PageThumbnailItem = ({ path, page, total, active, marked, onSelect }: PageThumbnailItemProps) => {
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={SIGN_TEXTS.page(page, total)}
      aria-current={active ? 'page' : undefined}
      onClick={() => onSelect(page)}
      className={cx(
        'relative flex shrink-0 cursor-pointer flex-col items-center gap-1 rounded-control border p-1.5 transition-colors',
        active ? 'border-mint bg-[#24302E]' : 'border-line bg-raised hover:border-line-strong',
      )}
    >
      <FileThumb path={path} kind="pdf" page={page} height={THUMBNAIL_HEIGHT} className="w-full" />
      <span className={cx('text-[11px] font-semibold', active ? 'text-mint' : 'text-muted')}>{page}</span>
      {marked && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-lilac" />}
    </button>
  );
};
