import { FAMILIES } from '@/modules/families/constants/families';
import type { FamilyId } from '@/modules/families/types/familyId';
import { cx } from '@/shared/utils/classNames';

interface FamilyGlupProps {
  family     : FamilyId;
  className? : string;
}

// The family's Glup: 128 px for normal scaling, 256 px for high. Decorative (the name is beside it).
export const FamilyGlup = ({ family, className }: FamilyGlupProps) => {
  const art = FAMILIES[family].art;

  return (
    <img
      src={art.small}
      srcSet={`${art.small} 1x, ${art.large} 2x`}
      alt=""
      draggable={false}
      className={cx('pointer-events-none shrink-0 select-none object-contain', className)}
    />
  );
};
