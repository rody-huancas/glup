import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A sheet in the four corners of a viewfinder: Escanear documento.
export const ScanIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M3.5 7.5v-2a2 2 0 0 1 2-2h2M16.5 3.5h2a2 2 0 0 1 2 2v2M20.5 16.5v2a2 2 0 0 1-2 2h-2M7.5 20.5h-2a2 2 0 0 1-2-2v-2" />
    <path d="M8.5 7.5h7v9h-7z" />
    <path d="M10.5 10.5h3M10.5 13h2" />
  </StrokeIcon>
);
