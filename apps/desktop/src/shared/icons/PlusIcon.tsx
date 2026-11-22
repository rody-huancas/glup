import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

export const PlusIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M12 5v14M5 12h14" />
  </StrokeIcon>
);
