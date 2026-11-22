import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

export const ToolsIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <path d="M17 13.5v7M13.5 17h7" />
  </StrokeIcon>
);
