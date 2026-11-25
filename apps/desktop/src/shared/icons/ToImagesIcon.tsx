import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A page turning into a picture: Pasar a imágenes.
export const ToImagesIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M9 3.5H5.5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2H10a2 2 0 0 0 2-2V6.5z" />
    <rect x="13" y="12" width="7.5" height="8.5" rx="1.5" />
    <path d="m13.5 19.5 2.25-2.25 1.5 1.5 1.25-1.25 1.5 1.5" />
    <path d="M14.5 5.5h2a2 2 0 0 1 2 2V9m-1.5-1 1.5 1.5L20 8" />
  </StrokeIcon>
);
