import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

export const HistoryIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3.5 4v4h4" />
    <path d="M12 7.5V12l3 2" />
  </StrokeIcon>
);
