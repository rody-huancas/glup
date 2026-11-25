import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A pen over a signature line: Firmar.
export const SignIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="m14.5 4.5 3 3L9 16l-3.5.5L6 13z" />
    <path d="M3.5 20.5c2-1.5 3.5-1.5 4.5 0s2.5 1.5 4 0 3-1.5 4 0 2.5 1 4.5 0" />
  </StrokeIcon>
);
