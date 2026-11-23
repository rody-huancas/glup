import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A clipboard with its clip and two lines: "Portapapeles".
export const ClipboardIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="2.5" width="6" height="3.5" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </StrokeIcon>
);
