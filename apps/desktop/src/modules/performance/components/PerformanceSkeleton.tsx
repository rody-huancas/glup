import { Skeleton } from '@/shared/components/Skeleton';

export const PerformanceSkeleton = () => (
  <div className="flex flex-col gap-2" aria-hidden>
    <div className="grid grid-cols-3 gap-2">
      <Skeleton className="h-24 rounded-[14px]" />
      <Skeleton className="h-24 rounded-[14px]" />
      <Skeleton className="h-24 rounded-[14px]" />
    </div>
    <Skeleton className="h-16 w-full rounded-[14px]" />
    <Skeleton className="h-40 w-full rounded-[14px]" />
  </div>
);
