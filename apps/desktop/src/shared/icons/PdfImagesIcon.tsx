import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A page with a picture on it: Sacar las imágenes.
export const PdfImagesIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
    <path d="M14 3.5V8h4.5" />
    <rect x="8" y="11" width="8" height="6.5" rx="1" />
    <path d="m8.5 17 2.5-2.5 1.75 1.75L14 15l2 2" />
  </StrokeIcon>
);
