import type { ReactNode } from 'react';
import { cx } from '@/shared/utils/classNames';

export type CardTone = 'surface' | 'raised';

interface CardProps {
  children   : ReactNode;
  tone?      : CardTone;
  className? : string;
  onClick?   : () => void;
}

const TONE_CLASSES: Record<CardTone, string> = {
  surface : 'bg-surface',
  raised  : 'bg-raised',
};

export const Card = ({ children, tone = 'raised', className, onClick }: CardProps) => {
  const classes = cx('rounded-[14px] border border-line', TONE_CLASSES[tone], className);

  if (!onClick) return <div className={classes}>{children}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(classes, 'cursor-pointer text-left transition-colors hover:border-line-strong')}
    >
      {children}
    </button>
  );
};
