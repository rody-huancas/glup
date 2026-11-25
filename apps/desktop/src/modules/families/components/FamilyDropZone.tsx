import { FamilyScope } from '@/modules/families/components/FamilyScope';
import { FAMILIES, FAMILY_STYLES, FAMILY_TEXTS } from '@/modules/families/constants/families';
import type { FamilyId } from '@/modules/families/types/familyId';
import type { HomeFiles } from '@/modules/home/interfaces/homeFiles';
import { HOME_TEXTS } from '@/modules/home/constants/home';
import { Button } from '@/shared/components/Button';
import { REVEAL_PROPS } from '@/shared/constants/reveal';
import { cx } from '@/shared/utils/classNames';

interface FamilyDropZoneProps {
  family : FamilyId;
  files  : HomeFiles;
}

// What this family takes and "Elegir archivos" with only those. A drop anywhere in the window goes
// through the same flow as in Inicio (where the actions show).
export const FamilyDropZone = ({ family, files }: FamilyDropZoneProps) => {
  const info   = FAMILIES[family];
  const style  = FAMILY_STYLES[family];
  const dialog = info.dialog;
  if (!dialog) return null;

  return (
    <section
      {...REVEAL_PROPS.card}
      aria-label={FAMILY_TEXTS.dropTitle}
      className={cx('flex items-center gap-4 rounded-[18px] border-2 border-dashed px-5 py-4 transition-colors', style.dark, files.dragging ? 'border-current' : style.border, style.text)}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-text">{files.notice ?? FAMILY_TEXTS.dropTitle}</p>
        <p className="mt-0.5 text-[12px] text-muted">{info.formats}</p>
      </div>
      <FamilyScope family={family} className="shrink-0">
        <Button onClick={() => files.pickFilesOf(dialog)} className="h-10 text-[13px]">
          <span aria-hidden>{HOME_TEXTS.chooseFiles}</span>
          <span className="sr-only">{FAMILY_TEXTS.chooseIn(info.name)}</span>
        </Button>
      </FamilyScope>
    </section>
  );
};
