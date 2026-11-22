import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

export const PinIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M9 4h6l-1 5 3 3v2H7v-2l3-3-1-5Z" />
    <path d="M12 14v6" />
  </StrokeIcon>
);
