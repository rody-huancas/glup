import { FamilyGlup } from '@/modules/families/components/FamilyGlup';
import { FAMILIES, FAMILY_STYLES, FAMILY_TEXTS } from '@/modules/families/constants/families';
import type { FamilyId } from '@/modules/families/types/familyId';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import { cx } from '@/shared/utils/classNames';

interface FamilyCardProps {
  family  : FamilyId;
  fact    : string;
  // A result waits inside (Limpieza finished while the person was elsewhere).
  badge?  : boolean;
  onOpen  : (family: FamilyId) => void;
}

// Its dark color, its Glup, its name and a live line. The whole card is one button.
export const FamilyCard = ({ family, fact, badge = false, onOpen }: FamilyCardProps) => {
  const style = FAMILY_STYLES[family];
  const name  = FAMILIES[family].name;

  return (
    <button
      type="button"
      {...REVEAL_PROPS.tool}
      onClick={() => onOpen(family)}
      aria-label={[FAMILY_TEXTS.open(name), fact, badge ? FAMILY_TEXTS.newResult : ''].filter(Boolean).join(' · ')}
      className={cx(
        'group relative flex min-h-[132px] min-w-0 cursor-pointer flex-col items-start justify-between overflow-hidden rounded-[18px] border p-4 text-left transition-[background-color,transform] duration-200 motion-safe:hover:-translate-y-0.5',
        style.dark,
        style.hover,
        style.border,
        style.edge,
      )}
    >
      <FamilyGlup family={family} className="absolute -right-2 -bottom-3 size-[88px] transition-transform duration-300 motion-safe:group-hover:scale-105" />
      <span className={cx('relative text-[15px] font-bold', style.text)}>{name}</span>
      <span className="relative mt-6 max-w-[60%] text-[12px] font-medium text-text/85">{fact}</span>
      {badge && <span aria-hidden className={cx('absolute top-3.5 right-3.5 size-2.5 rounded-full', style.fill)} />}
    </button>
  );
};
