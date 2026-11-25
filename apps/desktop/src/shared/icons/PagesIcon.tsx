import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// Pages in a row, with the arrow that reorders them: Organizar páginas.
export const PagesIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3.5" y="4.5" width="6.5" height="8.5" rx="1.2" />
    <rect x="14" y="4.5" width="6.5" height="8.5" rx="1.2" />
    <path d="M6.75 16.5c0 2 1.5 3 3.5 3h3.5c2 0 3.5-1 3.5-3" />
    <path d="m15.5 15 1.75 1.5L19 15" />
  </StrokeIcon>
);
