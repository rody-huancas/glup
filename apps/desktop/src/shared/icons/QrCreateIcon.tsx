import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// The three corners of a QR and a plus: Crear un QR.
export const QrCreateIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1.4" />
    <rect x="14" y="3" width="7" height="7" rx="1.4" />
    <rect x="3" y="14" width="7" height="7" rx="1.4" />
    <path d="M17.5 14v7M14 17.5h7" />
  </StrokeIcon>
);
