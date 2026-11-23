import { StrokeIcon } from '@/shared/icons/StrokeIcon';
import type { IconProps } from '@/shared/interfaces/icon';

// A file with a zipper down the middle: Juntar en ZIP.
export const ZipIcon = ({ className }: IconProps) => (
  <StrokeIcon className={className}>
    <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
    <path d="M14 3.5V8h4.5" />
    <path d="M11 4v2M11 8v2M11 12v2" />
    <rect x="9.75" y="15" width="2.5" height="3" rx="0.6" />
  </StrokeIcon>
);
