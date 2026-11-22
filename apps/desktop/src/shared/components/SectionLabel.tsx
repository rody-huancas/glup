import type { ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
}

export const SectionLabel = ({ children }: SectionLabelProps) => (
  <h2 className="text-[13px] font-semibold text-muted">{children}</h2>
);
