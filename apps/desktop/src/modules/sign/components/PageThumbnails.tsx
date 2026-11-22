import { PageThumbnailItem } from '@/modules/sign/components/PageThumbnailItem';
import { SIGN_TEXTS } from '@/modules/sign/constants/sign';
import { SectionLabel } from '@/shared/components/SectionLabel';

interface PageThumbnailsProps {
  path     : string;
  total    : number;
  current  : number;
  marked   : Set<number>;
  onSelect : (page: number) => void;
}

// Rendered lazily as they scroll into view.
export const PageThumbnails = ({ path, total, current, marked, onSelect }: PageThumbnailsProps) => (
  <aside className="flex w-[120px] shrink-0 flex-col gap-2">
    <SectionLabel>{SIGN_TEXTS.thumbnails}</SectionLabel>
    <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
      {Array.from({ length: total }, (_, index) => index + 1).map((page) => (
        <PageThumbnailItem
          key={page}
          path={path}
          page={page}
          total={total}
          active={page === current}
          marked={marked.has(page)}
          onSelect={onSelect}
        />
      ))}
    </div>
  </aside>
);
