import type { FileType } from '@/modules/actions/types/fileType';
import { useThumbnail } from '@/modules/pdf/hooks/useThumbnail';
import { Skeleton } from '@/shared/components/Skeleton';
import { useInView } from '@/shared/hooks/useInView';
import { cx } from '@/shared/utils/classNames';

interface FileThumbProps {
  path       : string;
  kind       : FileType;
  page?      : number;
  height     : number;
  className? : string;
}

// Rendered only once it scrolls into view.
export const FileThumb = ({ path, kind, page = 1, height, className }: FileThumbProps) => {
  const { ref, seen } = useInView<HTMLDivElement>();
  const url           = useThumbnail({ path, kind, page, height, enabled: seen });

  return (
    <div ref={ref} className={cx('flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/5', className)} style={{ height }}>
      {url ? (
        <img src={url} alt="" draggable={false} className="h-full w-auto object-contain" />
      ) : (
        <Skeleton className="h-full w-full" />
      )}
    </div>
  );
};
