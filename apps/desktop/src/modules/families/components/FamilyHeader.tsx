import { FamilyGlup } from '@/modules/families/components/FamilyGlup';
import { FAMILIES, FAMILY_STYLES } from '@/modules/families/constants/families';
import type { FamilyId } from '@/modules/families/types/familyId';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import { cx } from '@/shared/utils/classNames';

interface FamilyHeaderProps {
  family: FamilyId;
}

// The family's color, its Glup and what it does.
export const FamilyHeader = ({ family }: FamilyHeaderProps) => {
  const info  = FAMILIES[family];
  const style = FAMILY_STYLES[family];

  return (
    <header className={cx('relative flex min-h-[112px] items-center gap-4 overflow-hidden rounded-[18px] px-5 py-4', style.fill)}>
      <FamilyGlup family={family} className="size-[92px] -my-2" />
      <div className="min-w-0">
        <h1 {...REVEAL_PROPS.heading} className={cx('text-2xl leading-tight font-bold tracking-[-0.02em]', style.ink)}>{info.name}</h1>
        <p {...REVEAL_PROPS.heading} className={cx('mt-1 text-sm font-medium', style.ink)}>{info.hint}</p>
      </div>
    </header>
  );
};
