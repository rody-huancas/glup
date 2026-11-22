import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

export const ChevronRightIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="m9 6 6 6-6 6" />
  </StrokeIcon>
);
