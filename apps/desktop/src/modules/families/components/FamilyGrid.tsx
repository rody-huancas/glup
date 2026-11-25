import { useCleanup } from '@/modules/cleanup/hooks/useCleanup';
import { FamilyCard } from '@/modules/families/components/FamilyCard';
import { FAMILY_IDS, FAMILY_TEXTS } from '@/modules/families/constants/families';
import { useFamilyFacts } from '@/modules/families/hooks/useFamilyFacts';
import type { FamilyId } from '@/modules/families/types/familyId';
import { SectionLabel } from '@/shared/components/SectionLabel';

interface FamilyGridProps {
  onOpen: (family: FamilyId) => void;
}

// The six families under the big card of Inicio: three per row, two on a narrow panel.
export const FamilyGrid = ({ onOpen }: FamilyGridProps) => {
  const facts      = useFamilyFacts();
  const { unseen } = useCleanup();

  return (
    <section className="flex shrink-0 flex-col gap-3">
      <SectionLabel>{FAMILY_TEXTS.title}</SectionLabel>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))] gap-3">
        {FAMILY_IDS.map((family) => (
          <FamilyCard key={family} family={family} fact={facts[family]} badge={family === 'pc' && unseen} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
};
