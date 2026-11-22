import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A broom: Limpieza.
export const CleanupIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M19.5 3.5 12 11" />
    <path d="M9.5 9.5 14.5 14.5" />
    <path d="M9.5 9.5c-2.5 0-4.5 2-5 4.5l-1 6.5 6.5-1c2.5-.5 4.5-2.5 4.5-5" />
    <path d="M7 17.5 9 15.5" />
  </StrokeIcon>
);
