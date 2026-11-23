import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

export const SearchIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </StrokeIcon>
);
