import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A person cut out from what is behind: Quitar el fondo.
export const RemoveBackgroundIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <circle cx="12" cy="9" r="3" />
    <path d="M6.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M3.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2M17 3.5h2A1.5 1.5 0 0 1 20.5 5v2M20.5 17v2a1.5 1.5 0 0 1-1.5 1.5h-2M7 20.5H5A1.5 1.5 0 0 1 3.5 19v-2" />
  </StrokeIcon>
);
