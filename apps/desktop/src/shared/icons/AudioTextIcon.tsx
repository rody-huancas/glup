import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A microphone and its stand: "Pasar audio a texto".
export const AudioTextIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
  </StrokeIcon>
);
