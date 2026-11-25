import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A card with a face and two lines: Foto carnet.
export const IdPhotoIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8.5" cy="10.5" r="2" />
    <path d="M5.5 16a3 3 0 0 1 6 0" />
    <path d="M14 10h4M14 13.5h3" />
  </StrokeIcon>
);
