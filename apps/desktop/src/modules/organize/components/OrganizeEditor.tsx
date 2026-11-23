import { OrganizeFooter } from '@/modules/organize/components/OrganizeFooter';
import { OrganizeToolbar } from '@/modules/organize/components/OrganizeToolbar';
import { PageTile } from '@/modules/organize/components/PageTile';
import { ORGANIZE_TEXTS } from '@/modules/organize/constants/texts';
import { useOrganizeEditor } from '@/modules/organize/hooks/useOrganizeEditor';
import { usePageDrag } from '@/modules/organize/hooks/usePageDrag';
import type { OrganizeTarget } from '@/modules/organize/interfaces/organizeTarget';
import type { TileActions } from '@/modules/organize/interfaces/tileActions';
import { summaryLine } from '@/modules/organize/utils/summary';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

interface OrganizeEditorProps {
  target      : OrganizeTarget;
  total       : number;
  destination : SaveDestination;
  onExit      : () => void;
}

// The grid of pages with its bar on top and Cancelar / Guardar PDF below.
export const OrganizeEditor = ({ target, total, destination, onExit }: OrganizeEditorProps) => {
  const editor = useOrganizeEditor({ target, total, destination, onExit });
  const drag   = usePageDrag({
    order    : editor.order,
    selected : editor.selected,
    onPick   : (page) => editor.select(page, 'single'),
    onDrop   : editor.move,
  });

  const actions: TileActions = {
    onSelect        : editor.select,
    onRotate        : (page, direction) => editor.rotate([page], direction),
    onRemove        : (page) => editor.remove([page]),
    onRestore       : (page) => editor.restore([page]),
    onPointerDown   : drag.onPointerDown,
    onPointerMove   : drag.onPointerMove,
    onPointerUp     : drag.onPointerUp,
    onPointerCancel : drag.onPointerCancel,
    takeClick       : drag.takeClick,
    registerTile    : drag.registerTile,
  };

  const last = editor.pages.length - 1;
  const note = !editor.changed ? ORGANIZE_TEXTS.noChanges : editor.canSave ? summaryLine(editor.summary) : ORGANIZE_TEXTS.allRemoved;

  return (
    <div className="relative flex h-full w-full p-3">
      <div className="flex min-w-0 flex-1 flex-col rounded-[18px] border border-line bg-surface">
        <OrganizeToolbar
          name={target.name}
          selectedCount={editor.selected.length}
          allSelected={editor.allSelected}
          allRemoved={editor.allRemoved}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onRotate={() => editor.rotate(editor.selected, 'right')}
          onRemove={() => editor.remove(editor.selected)}
          onRestore={() => editor.restore(editor.selected)}
          onSelectAll={editor.selectAll}
          onSelectNone={editor.selectNone}
          onUndo={editor.undo}
          onRedo={editor.redo}
        />
        {/* grid-cols-6 matches GRID_COLUMNS (Arrow up/down jump a row). */}
        <ul ref={drag.gridRef} aria-label={ORGANIZE_TEXTS.title} className="scroll-thin grid min-h-0 flex-1 grid-cols-6 content-start gap-3 overflow-y-auto p-5">
          {editor.pages.map((item, index) => (
            <PageTile
              key={item.page}
              path={target.path}
              item={item}
              selected={editor.selected.includes(item.page)}
              focused={editor.focused === item.page}
              dragging={drag.dragging?.includes(item.page) ?? false}
              dropBefore={drag.dropAt === index}
              dropAfter={drag.dropAt === index + 1 && index === last}
              takeFocus={editor.takeKeyFocus}
              actions={actions}
            />
          ))}
        </ul>
        <OrganizeFooter note={note} canSave={editor.canSave} onCancel={editor.requestExit} onSave={editor.save} />
      </div>
      {editor.confirmExit && (
        <ConfirmDialog
          title={ORGANIZE_TEXTS.exitTitle}
          body={ORGANIZE_TEXTS.exitBody}
          cancel={ORGANIZE_TEXTS.keepEditing}
          confirm={ORGANIZE_TEXTS.exit}
          onCancel={editor.keepEditing}
          onConfirm={onExit}
        />
      )}
    </div>
  );
};
