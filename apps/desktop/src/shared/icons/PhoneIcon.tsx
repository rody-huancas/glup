import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A phone with its camera: Fotos de iPhone a JPG.
export const PhoneIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
    <circle cx="10" cy="6.25" r="1" />
    <path d="M10.5 18.5h3" />
  </StrokeIcon>
);
