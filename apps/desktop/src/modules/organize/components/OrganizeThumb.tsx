import { THUMB_SIZE } from '@/modules/organize/constants/grid';
import type { PageRotation } from '@/modules/organize/types/pageRotation';
import { useThumbnail } from '@/modules/pdf/hooks/useThumbnail';
import { Skeleton } from '@/shared/components/Skeleton';
import { useInView } from '@/shared/hooks/useInView';
import { cx } from '@/shared/utils/classNames';

interface OrganizeThumbProps {
  path     : string;
  page     : number;
  rotation : PageRotation;
  removed  : boolean;
}

// Rendered once it scrolls into view. The box is square, so a turned page still fits inside it.
export const OrganizeThumb = ({ path, page, rotation, removed }: OrganizeThumbProps) => {
  const { ref, seen } = useInView<HTMLDivElement>();
  const url           = useThumbnail({ path, kind: 'pdf', page, height: THUMB_SIZE, enabled: seen });

  return (
    <div ref={ref} className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-bg">
      {url ? (
        <img
          src={url}
          alt=""
          draggable={false}
          className={cx(
            'max-h-full max-w-full object-contain shadow-md transition-[transform,opacity,filter] duration-200 ease-out motion-reduce:transition-none',
            removed && 'opacity-35 grayscale',
          )}
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      ) : (
        <Skeleton className="h-full w-[72%]" />
      )}
    </div>
  );
};
