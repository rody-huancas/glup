import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A gauge: Rendimiento.
export const GaugeIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M4.5 16.5a8 8 0 1 1 15 0" />
    <path d="M12 13.5 15.5 9" />
    <circle cx="12" cy="14" r="1.25" />
  </StrokeIcon>
);
