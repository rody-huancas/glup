import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

export const ChevronUpIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="m6 15 6-6 6 6" />
  </StrokeIcon>
);
