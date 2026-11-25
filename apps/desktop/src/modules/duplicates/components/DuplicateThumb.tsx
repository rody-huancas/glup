import { THUMB_HEIGHT } from '@/modules/duplicates/constants/texts';
import { kindOf } from '@/modules/duplicates/utils/filters';
import { useThumbnail } from '@/modules/pdf/hooks/useThumbnail';
import { useInView } from '@/shared/hooks/useInView';
import { FileIcon } from '@/shared/icons/FileIcon';

interface DuplicateThumbProps {
  path : string;
}

// The group's picture: the photo or the first page of the PDF once it comes into view; an icon for the rest.
export const DuplicateThumb = ({ path }: DuplicateThumbProps) => {
  const { ref, seen } = useInView<HTMLSpanElement>();
  const kind          = kindOf(path);
  const pdf           = path.toLowerCase().endsWith('.pdf');
  const url           = useThumbnail({ path, kind: kind === 'photos' ? 'image' : pdf ? 'pdf' : 'other', page: 1, height: THUMB_HEIGHT * 2, enabled: seen });

  return (
    <span ref={ref} className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-bg text-muted">
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <FileIcon className="size-6" />}
    </span>
  );
};
