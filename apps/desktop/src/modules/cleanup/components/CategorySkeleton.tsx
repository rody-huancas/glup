import { CATEGORY_TEXTS } from '@/modules/cleanup/constants/texts';
import type { CategoryId } from '@/modules/cleanup/types/categoryId';
import { Card } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';

interface CategorySkeletonProps {
  id: CategoryId;
}

// A category still being checked.
export const CategorySkeleton = ({ id }: CategorySkeletonProps) => (
  <Card className="flex min-h-16 items-center gap-3 px-4 py-3">
    <Skeleton className="size-4 rounded-[5px]" />
    <div className="min-w-0 flex-1">
      <p className="text-[14px] font-semibold text-muted">{CATEGORY_TEXTS[id].name}</p>
      <Skeleton className="mt-1.5 h-3 w-2/3" />
    </div>
    <Skeleton className="h-4 w-14" />
  </Card>
);
