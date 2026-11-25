import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A stretch between two marks on a line: Recortar.
export const TrimIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M3.5 12h17" />
    <path d="M8 6v12M16 6v12" />
    <path d="M8 9h8v6H8z" />
  </StrokeIcon>
);
