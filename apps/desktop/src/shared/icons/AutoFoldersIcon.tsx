import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A folder with a small spark: it does things on its own.
export const AutoFoldersIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v3" />
    <path d="M3 7v10a2 2 0 0 0 2 2h7" />
    <path d="M18 14l-2 3h4l-2 3" />
  </StrokeIcon>
);
