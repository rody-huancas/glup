import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A page with its number at the foot: Numerar páginas.
export const PageNumbersIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
    <path d="M14 3.5V8h4.5" />
    <path d="M8.5 11h7M8.5 13.5h5" />
    <path d="M11 17.25h2" />
  </StrokeIcon>
);
