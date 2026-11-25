import type { CSSProperties, ReactNode } from 'react';
import type { FamilyId } from '@/modules/families/types/familyId';

interface FamilyScopeProps {
  family     : FamilyId | null;
  children   : ReactNode;
  className? : string;
}

// Inside, mint (buttons, bars) takes the family's color and its ink: the task card of a PDF is coral.
export const FamilyScope = ({ family, children, className }: FamilyScopeProps) => {
  const style = family
    ? ({ '--color-mint': `var(--color-fam-${family})`, '--color-mint-ink': `var(--color-fam-${family}-ink)` } as CSSProperties)
    : undefined;

  return (
    <div style={style} className={className}>
      {children}
    </div>
  );
};
