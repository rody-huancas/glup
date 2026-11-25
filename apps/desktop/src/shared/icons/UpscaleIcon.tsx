import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A small square growing into a big one, with a spark: Mejorar calidad.
export const UpscaleIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3" y="13" width="7" height="7" rx="1.2" />
    <path d="M13 4h7v7M20 4l-8 8" />
    <path d="M6.5 6.5v3M5 8h3" />
  </StrokeIcon>
);
