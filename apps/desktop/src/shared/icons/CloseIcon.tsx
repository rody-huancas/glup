import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

export const CloseIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </StrokeIcon>
);
