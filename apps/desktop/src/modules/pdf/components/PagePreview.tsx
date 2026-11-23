import { useState } from 'react';
import type { ReactNode } from 'react';
import { PREVIEW_HEIGHT } from '@/modules/pdf/constants/pdf';
import { useThumbnail } from '@/modules/pdf/hooks/useThumbnail';
import { Skeleton } from '@/shared/components/Skeleton';
import type { Size } from '@/shared/interfaces/size';

interface PagePreviewProps {
  path     : string;
  page     : number;
  label    : string;
  // What is drawn over the page, given its size on screen in pixels.
  children : (size: Size) => ReactNode;
}

// One page with pdf.js and something on top of it, to see an option before running.
export const PagePreview = ({ path, page, label, children }: PagePreviewProps) => {
  const url             = useThumbnail({ path, kind: 'pdf', page, height: PREVIEW_HEIGHT, enabled: true });
  const [size, setSize] = useState<Size | null>(null);

  return (
    <figure className="flex shrink-0 flex-col items-center gap-1.5">
      <div className="relative overflow-hidden rounded-md bg-white shadow-md" style={{ height: PREVIEW_HEIGHT, width: size?.width ?? PREVIEW_HEIGHT * 0.71 }}>
        {url ? (
          <img
            src={url}
            alt=""
            draggable={false}
            onLoad={(event) => {
              const image = event.currentTarget;
              setSize({ width: (PREVIEW_HEIGHT * image.naturalWidth) / Math.max(image.naturalHeight, 1), height: PREVIEW_HEIGHT });
            }}
            className="h-full w-auto"
          />
        ) : (
          <Skeleton className="h-full w-full" />
        )}
        {size && <div className="pointer-events-none absolute inset-0 overflow-hidden">{children(size)}</div>}
      </div>
      <figcaption className="text-[11px] text-muted">{label}</figcaption>
    </figure>
  );
};
