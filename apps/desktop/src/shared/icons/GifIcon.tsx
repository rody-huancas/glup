import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A frame with the letters of an animation: Video a GIF.
export const GifIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2.2" />
    <path d="M10 10H8.2a1.2 1.2 0 0 0-1.2 1.2v1.6A1.2 1.2 0 0 0 8.2 14H10v-2H9" />
    <path d="M12.5 10v4" />
    <path d="M15.5 14v-4H18M15.5 12h2" />
  </StrokeIcon>
);
