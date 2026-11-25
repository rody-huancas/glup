import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// The corners of a viewfinder around a small QR: Leer un QR.
export const QrReadIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
    <rect x="7.5" y="7.5" width="4" height="4" rx="0.8" />
    <path d="M14 8h2.5M14 12.5h2.5v3.5M7.5 15h4v1.5" />
  </StrokeIcon>
);
