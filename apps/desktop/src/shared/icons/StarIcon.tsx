import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

interface StarIconProps extends IconProps {
  filled? : boolean;
}

// A favorite: filled when it is one.
export const StarIcon = ({ className, filled = false }: StarIconProps) => (
  <StrokeIcon className={className}>
    <path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z" fill={filled ? 'currentColor' : 'none'} />
  </StrokeIcon>
);
