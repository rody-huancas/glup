import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A folder: Ordenar una carpeta.
export const FolderIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
    <path d="M3.5 10.5h17" />
  </StrokeIcon>
);
