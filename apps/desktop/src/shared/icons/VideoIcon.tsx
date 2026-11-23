import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A film frame with a play mark: videos.
export const VideoIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="m10.5 9.5 4 2.5-4 2.5z" />
  </StrokeIcon>
);
