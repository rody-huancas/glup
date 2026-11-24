import { Button } from '@/shared/components/Button';
import { SELECTION_TEXTS } from '@/shared/constants/selection';
import { cx } from '@/shared/utils/classNames';

interface SelectionBarProps {
  // How many lines are marked; with none the bar is not there (nor reachable with Tab).
  count    : number;
  onRemove : () => void;
  // Unmarks everything.
  onCancel : () => void;
}

// Next to "Seleccionar todo", right above the list: how many are marked, "Quitar" (in the alert color)
// and "Cancelar". It fades in and out (no movement with reduced motion) and says the count aloud.
export const SelectionBar = ({ count, onRemove, onCancel }: SelectionBarProps) => {
  const visible = count > 0;

  return (
    <div className="flex min-w-0 items-center">
      <span aria-live="polite" className="sr-only">
        {visible ? SELECTION_TEXTS.count(count) : ''}
      </span>
      <div
        inert={!visible}
        aria-hidden={!visible}
        className={cx(
          'flex items-center gap-2 rounded-control border border-line-strong bg-raised py-1 pl-3 pr-1 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-opacity',
          visible ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-2 opacity-0 motion-reduce:translate-x-0',
        )}
      >
        <span className="whitespace-nowrap text-[12px] font-semibold text-text">{SELECTION_TEXTS.count(count)}</span>
        <Button variant="danger" onClick={onRemove} className="h-7 px-3 text-[12px]">
          {SELECTION_TEXTS.remove}
        </Button>
        <Button variant="secondary" onClick={onCancel} className="h-7 px-3 text-[12px]">
          {SELECTION_TEXTS.cancel}
        </Button>
      </div>
    </div>
  );
};
