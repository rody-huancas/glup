import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A screen with two lines of text at its bottom: Subtítulos.
export const SubtitlesIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2.2" />
    <path d="M7 12.5h6M15 12.5h2M7 15.5h3M12 15.5h5" />
  </StrokeIcon>
);
