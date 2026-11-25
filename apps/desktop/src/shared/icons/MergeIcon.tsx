import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// Two pages coming together into one: Unir.
export const MergeIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3.5" y="3.5" width="7" height="9" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="9" rx="1.5" />
    <path d="M7 12.5v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
    <path d="M12 16.5v4" />
  </StrokeIcon>
);
