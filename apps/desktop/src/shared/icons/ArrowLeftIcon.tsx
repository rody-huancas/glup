import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

export const ArrowLeftIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </StrokeIcon>
);
