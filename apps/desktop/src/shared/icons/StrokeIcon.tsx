import type { ReactNode } from 'react';
import { cx } from '@/shared/utils/classNames';

interface StrokeIconProps {
  className? : string;
  children   : ReactNode;
}

export const StrokeIcon = ({ className, children }: StrokeIconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={cx('size-5 shrink-0', className)}
  >
    {children}
  </svg>
);
