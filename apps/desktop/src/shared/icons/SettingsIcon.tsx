import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

export const SettingsIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2.2" />
    <circle cx="8" cy="17" r="2.2" />
  </StrokeIcon>
);
