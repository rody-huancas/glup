import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A photo with a © in its corner: Marca de agua.
export const PhotoMarkIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2.2" />
    <path d="m3.5 16 5-5 4 4 2.5-2.5 5.5 5" />
    <circle cx="16.5" cy="8.5" r="2.2" />
    <path d="M17.3 7.8a1 1 0 1 0 0 1.4" />
  </StrokeIcon>
);
