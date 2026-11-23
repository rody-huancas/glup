import { ORGANIZE_TEXTS } from '@/modules/organize/constants/texts';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { RedoIcon } from '@/shared/icons/RedoIcon';
import { UndoIcon } from '@/shared/icons/UndoIcon';

interface OrganizeToolbarProps {
  name          : string;
  selectedCount : number;
  allSelected   : boolean;
  // Every chosen page is already removed: the bar offers "Recuperar" instead of "Quitar".
  allRemoved    : boolean;
  canUndo       : boolean;
  canRedo       : boolean;
  onRotate      : () => void;
  onRemove      : () => void;
  onRestore     : () => void;
  onSelectAll   : () => void;
  onSelectNone  : () => void;
  onUndo        : () => void;
  onRedo        : () => void;
}

// Always the same height, so the grid never jumps: the hint, or the bar for several chosen pages.
export const OrganizeToolbar = (props: OrganizeToolbarProps) => {
  const several = props.selectedCount > 1;

  return (
    <header className="flex shrink-0 flex-col gap-3 border-b border-line px-5 pb-3 pt-4">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="text-lg font-bold tracking-[-0.01em] text-text">{ORGANIZE_TEXTS.title}</h1>
        <span className="truncate text-[13px] text-muted">{props.name}</span>
      </div>
      <div className="flex h-9 items-center gap-2">
        {several ? (
          <>
            <span className="mr-1 text-[13px] font-semibold text-mint">{ORGANIZE_TEXTS.selected(props.selectedCount)}</span>
            <Button variant="secondary" onClick={props.onRotate} className="h-8">
              {ORGANIZE_TEXTS.rotate}
            </Button>
            <Button variant="secondary" onClick={props.allRemoved ? props.onRestore : props.onRemove} className="h-8">
              {props.allRemoved ? ORGANIZE_TEXTS.restore : ORGANIZE_TEXTS.remove}
            </Button>
          </>
        ) : (
          <p className="min-w-0 truncate text-[12px] text-muted">{ORGANIZE_TEXTS.hint}</p>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="secondary" onClick={props.allSelected ? props.onSelectNone : props.onSelectAll} className="h-8">
            {props.allSelected ? ORGANIZE_TEXTS.selectNone : ORGANIZE_TEXTS.selectAll}
          </Button>
          <span className="mx-1 h-5 w-px bg-line" />
          <IconButton icon={UndoIcon} label={ORGANIZE_TEXTS.undo} onClick={props.onUndo} disabled={!props.canUndo} className="size-8" iconClass="size-4" />
          <IconButton icon={RedoIcon} label={ORGANIZE_TEXTS.redo} onClick={props.onRedo} disabled={!props.canRedo} className="size-8" iconClass="size-4" />
        </div>
      </div>
    </header>
  );
};
