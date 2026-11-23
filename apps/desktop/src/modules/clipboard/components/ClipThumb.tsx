import { useClipThumb } from '@/modules/clipboard/hooks/useClipThumb';
import { Skeleton } from '@/shared/components/Skeleton';
import { ClipboardIcon } from '@/shared/icons/ClipboardIcon';

interface ClipThumbProps {
  id: string;
}

// The thumbnail of a copied image; a skeleton while Rust decrypts it, the icon if it cannot.
export const ClipThumb = ({ id }: ClipThumbProps) => {
  const { url, failed } = useClipThumb(id);

  if (failed) {
    return (
      <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md bg-bg text-muted">
        <ClipboardIcon />
      </span>
    );
  }

  if (!url) return <Skeleton className="h-14 w-20 shrink-0" />;

  return <img src={url} alt="" draggable={false} className="h-14 w-20 shrink-0 rounded-md bg-bg object-contain" />;
};
