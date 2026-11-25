import type { Accent } from '@/shared/types/accent';
import { cx } from '@/shared/utils/classNames';

interface ChoiceCardProps {
  label    : string;
  hint     : string;
  selected : boolean;
  accent   : Exclude<Accent, 'mint'>;
  onChoose : () => void;
}

const CHOSEN: Record<ChoiceCardProps['accent'], { card: string; label: string; ring: string }> = {
  media  : { card: 'border-fam-media', label: 'text-fam-media', ring: 'focus-visible:ring-fam-media' },
  images : { card: 'border-fam-images', label: 'text-fam-images', ring: 'focus-visible:ring-fam-images' },
};

// One choice of a radio group on the screens of a family, chosen in the family's colour.
export const ChoiceCard = ({ label, hint, selected, accent, onChoose }: ChoiceCardProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onChoose}
    className={cx(
      'flex min-w-0 flex-1 cursor-pointer flex-col rounded-control border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-2',
      CHOSEN[accent].ring,
      selected ? `${CHOSEN[accent].card} bg-raised` : 'border-line-strong bg-bg hover:border-line-dashed',
    )}
  >
    <span className={cx('text-[12px] font-semibold', selected ? CHOSEN[accent].label : 'text-text')}>{label}</span>
    <span className="text-[11px] leading-4 text-muted">{hint}</span>
  </button>
);
