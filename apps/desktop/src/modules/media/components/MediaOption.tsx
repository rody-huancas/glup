import { cx } from '@/shared/utils/classNames';

interface MediaOptionProps {
  label    : string;
  hint     : string;
  selected : boolean;
  onChoose : () => void;
}

// One choice of a radio group on the screens of Audio y video, chosen in the family's yellow.
export const MediaOption = ({ label, hint, selected, onChoose }: MediaOptionProps) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onChoose}
    className={cx(
      'flex min-w-0 flex-1 cursor-pointer flex-col rounded-control border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-fam-media',
      selected ? 'border-fam-media bg-raised' : 'border-line-strong bg-bg hover:border-line-dashed',
    )}
  >
    <span className={cx('text-[12px] font-semibold', selected ? 'text-fam-media' : 'text-text')}>{label}</span>
    <span className="text-[11px] leading-4 text-muted">{hint}</span>
  </button>
);
