import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A picture: the image tools.
export const ImageIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4.5 17.5 5-5 3.5 3.5 2.5-2.5 4 4" />
  </StrokeIcon>
);
