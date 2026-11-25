import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A page cut in two along a dashed line: Separar.
export const SplitIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M6.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v4.5M5 9.5V5a1.5 1.5 0 0 1 1.5-1.5" />
    <path d="M5 14.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-4.5" />
    <path d="M3 12h2.5M9 12h2.5M15 12h2.5M21 12h-.5" />
  </StrokeIcon>
);
