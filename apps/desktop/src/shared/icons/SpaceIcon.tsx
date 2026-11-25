import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// Blocks of different sizes in a frame: a map of what takes space.
export const SpaceIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M11 4v16M11 13h10M16 13v7" />
  </StrokeIcon>
);
