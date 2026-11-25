import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// Two arrows going round: Convertir.
export const ConvertIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M4.5 10a7.5 7.5 0 0 1 13.4-3.6" />
    <path d="M18.5 3.5v3.5H15" />
    <path d="M19.5 14a7.5 7.5 0 0 1-13.4 3.6" />
    <path d="M5.5 20.5V17H9" />
  </StrokeIcon>
);
