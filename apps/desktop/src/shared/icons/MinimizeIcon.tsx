import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

export const MinimizeIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M5 12h14" />
  </StrokeIcon>
);
