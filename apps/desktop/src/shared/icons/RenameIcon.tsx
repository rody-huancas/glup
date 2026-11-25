import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// Two name tags with a cursor: Renombrar en lote.
export const RenameIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3" y="5" width="13" height="6" rx="1.5" />
    <rect x="3" y="13" width="13" height="6" rx="1.5" />
    <path d="M19.5 4v16M18 4h3M18 20h3" />
  </StrokeIcon>
);
