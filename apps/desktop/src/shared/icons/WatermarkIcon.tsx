import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A page with a stamp across it: Marca de agua.
export const WatermarkIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
    <path d="M14 3.5V8h4.5" />
    <path d="m8.5 16.5 7-7" />
    <path d="M9 12.5 11.5 15" />
  </StrokeIcon>
);
