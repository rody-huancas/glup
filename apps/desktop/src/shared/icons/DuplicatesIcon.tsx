import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// Two copies of one file, one behind the other: Archivos repetidos.
export const DuplicatesIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M8 7.5V5.5a2 2 0 0 1 2-2h5l4 4v9a2 2 0 0 1-2 2h-1.5" />
    <path d="M13 9.5H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" />
    <path d="M8 15h4" />
  </StrokeIcon>
);
