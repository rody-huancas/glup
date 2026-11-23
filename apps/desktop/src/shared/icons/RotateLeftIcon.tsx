import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A counterclockwise arrow: girar a la izquierda.
export const RotateLeftIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M4 11a8 8 0 1 0 2.34-5.66" />
    <path d="M4 4v5h5" />
  </StrokeIcon>
);
