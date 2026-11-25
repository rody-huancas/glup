import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A note coming out of a frame of film: Sacar el audio.
export const ExtractAudioIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3" y="4.5" width="11" height="9" rx="1.8" />
    <path d="m14 7.5 3-1.5v6l-3-1.5" />
    <path d="M16 20.5v-5l4.5-1v5" />
    <circle cx="14.6" cy="20.5" r="1.4" />
    <circle cx="19.1" cy="19.5" r="1.4" />
  </StrokeIcon>
);
