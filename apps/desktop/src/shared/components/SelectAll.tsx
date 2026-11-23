import { Checkbox } from '@/shared/components/Checkbox';
import type { SelectionState } from '@/shared/types/selectionState';

interface SelectAllProps {
  label    : string;
  state    : SelectionState;
  onToggle : () => void;
}

// "Seleccionar todo", half-marked when only some lines are; the text toggles it too.
export const SelectAll = ({ label, state, onToggle }: SelectAllProps) => (
  <label className="flex w-fit cursor-pointer items-center gap-2.5 pl-3 text-[13px] font-semibold text-muted">
    <Checkbox label={label} checked={state === 'all'} indeterminate={state === 'some'} onChange={onToggle} />
    <span aria-hidden>{label}</span>
  </label>
);
