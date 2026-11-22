import { cx } from '@/shared/utils/classNames';

interface SkeletonProps {
  className?: string;
}

// Placeholder block with a soft shimmer, sized like the content it stands for.
export const Skeleton = ({ className }: SkeletonProps) => (
  <span aria-hidden className={cx('shimmer block rounded-md', className)} />
);
