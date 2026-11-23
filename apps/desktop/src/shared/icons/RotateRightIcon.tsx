import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A clockwise arrow: girar a la derecha.
export const RotateRightIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M20 11a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v5h-5" />
  </StrokeIcon>
);
