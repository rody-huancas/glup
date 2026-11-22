import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

export const ChevronDownIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="m6 9 6 6 6-6" />
  </StrokeIcon>
);
