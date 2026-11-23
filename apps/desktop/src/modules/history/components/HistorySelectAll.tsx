import { HISTORY_TEXTS } from '@/modules/history/constants/history';
import type { SelectionState } from '@/modules/history/types/selectionState';
import { Checkbox } from '@/shared/components/Checkbox';

interface HistorySelectAllProps {
  state    : SelectionState;
  onToggle : () => void;
}

// "Seleccionar todo", half-marked when only some lines are; the text toggles it too.
export const HistorySelectAll = ({ state, onToggle }: HistorySelectAllProps) => (
  <label className="flex w-fit cursor-pointer items-center gap-2.5 pl-3 text-[13px] font-semibold text-muted">
    <Checkbox label={HISTORY_TEXTS.selectAll} checked={state === 'all'} indeterminate={state === 'some'} onChange={onToggle} />
    <span aria-hidden>{HISTORY_TEXTS.selectAll}</span>
  </label>
);
