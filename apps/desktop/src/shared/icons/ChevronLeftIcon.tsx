import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

export const ChevronLeftIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="m15 6-6 6 6 6" />
  </StrokeIcon>
);
