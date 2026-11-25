import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A tall frame and a square one: the sizes of the networks.
export const SocialSizeIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3.5" y="3" width="9" height="16" rx="1.8" />
    <rect x="14.5" y="9" width="6" height="6" rx="1.2" />
    <path d="M6.5 15.5l2-2.5 2 2.5" />
  </StrokeIcon>
);
