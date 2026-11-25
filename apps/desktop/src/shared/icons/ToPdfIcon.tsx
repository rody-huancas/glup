import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A picture going into a page: Imágenes a PDF.
export const ToPdfIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3.5" y="3.5" width="8" height="7" rx="1.2" />
    <path d="m4 10 2.25-2.25L8 9.5l1.25-1.25L11 10" />
    <path d="M17 9.5h-3.5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2V13z" />
    <path d="M7.5 13.5v1a2 2 0 0 0 2 2h1m-1.5-1.5 1.5 1.5-1.5 1.5" />
  </StrokeIcon>
);
