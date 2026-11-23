import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// The corners of a chosen zone around a letter T: "Copiar texto de la pantalla".
export const ScreenTextIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
    <path d="M8.5 9h7M12 9v7" />
  </StrokeIcon>
);
