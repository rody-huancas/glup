import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// An open padlock: Quitar contraseña.
export const UnlockIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 6.8-1.2" />
    <path d="M12 14.5v2" />
  </StrokeIcon>
);
