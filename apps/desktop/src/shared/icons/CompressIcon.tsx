import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// Two arrows pressing a box smaller: Reducir peso.
export const CompressIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="8" y="8" width="8" height="8" rx="1.5" />
    <path d="M3.5 3.5 7 7M7 4v3H4" />
    <path d="M20.5 20.5 17 17M17 20v-3h3" />
  </StrokeIcon>
);
