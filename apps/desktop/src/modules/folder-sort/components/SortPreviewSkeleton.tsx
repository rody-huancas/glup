import { Skeleton } from '@/shared/components/Skeleton';

// While the folder is read.
export const SortPreviewSkeleton = () => (
  <div className="flex flex-col gap-2">
    {[0, 1, 2, 3].map((row) => <Skeleton key={row} className="h-11 w-full rounded-[14px]" />)}
  </div>
);
