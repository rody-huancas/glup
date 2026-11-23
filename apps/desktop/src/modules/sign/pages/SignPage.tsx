import { CreateSignatureModal } from '@/modules/sign/components/CreateSignatureModal';
import { PageThumbnails } from '@/modules/sign/components/PageThumbnails';
import { PageViewer } from '@/modules/sign/components/PageViewer';
import type { PlacementActions } from '@/modules/sign/components/PlacementItem';
import { SignaturesPanel } from '@/modules/sign/components/SignaturesPanel';
import { SignFooter } from '@/modules/sign/components/SignFooter';
import { SIGN_TEXTS } from '@/modules/sign/constants/sign';
import { useSignScreen } from '@/modules/sign/hooks/useSignScreen';
import type { SignTarget } from '@/modules/sign/interfaces/signTarget';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

interface SignPageProps {
  target      : SignTarget;
  destination : SaveDestination;
  onExit      : () => void;
}

// Takes the whole panel while signing: pages on the left, the page in the middle, signatures on the right.
export const SignPage = ({ target, destination, onExit }: SignPageProps) => {
  const screen     = useSignScreen({ target, destination, onExit });
  const placements = screen.placements;
  const pageSize   = screen.pages.sizes?.[screen.page - 1] ?? null;

  const actions: PlacementActions = {
    onSelect    : placements.select,
    onMove      : placements.move,
    onResize    : placements.resize,
    onRemove    : placements.remove,
    onDuplicate : placements.duplicate,
    onRepeat    : placements.repeat,
    onText      : placements.setText,
    onFont      : placements.changeFont,
    onEdit      : placements.edit,
    onStopEdit  : placements.stopEditing,
  };

  return (
    <div className="relative flex h-full w-full p-3">
      <div className="flex min-w-0 flex-1 flex-col rounded-[18px] border border-line bg-surface">
        <div className="flex min-h-0 flex-1 gap-3 p-3">
          <PageThumbnails path={target.path} total={screen.total} current={screen.page} marked={screen.marked} onSelect={screen.goTo} />
          <PageViewer
            path={target.path}
            name={target.name}
            page={screen.page}
            total={screen.total}
            pageSize={pageSize}
            failed={screen.pages.failed}
            placements={placements.placements.filter((placement) => placement.page === screen.page)}
            selectedId={placements.selectedId}
            editingId={placements.editingId}
            actions={actions}
            onClear={() => placements.select(null)}
            onGoTo={screen.goTo}
          />
          <SignaturesPanel
            signatures={screen.signatures.signatures}
            onUse={screen.placeSignature}
            onDelete={screen.askDelete}
            onCreate={screen.openCreate}
            onAddDate={screen.addDate}
            onAddText={screen.addText}
          />
        </div>
        <SignFooter canSave={screen.canSave} onCancel={screen.requestExit} onSave={screen.save} />
      </div>
      {screen.creating && <CreateSignatureModal savedCount={screen.signatures.savedCount} onCancel={screen.closeCreate} onAccept={screen.createSignature} />}
      {screen.confirmExit && (
        <ConfirmDialog
          title={SIGN_TEXTS.exitTitle}
          body={SIGN_TEXTS.exitBody}
          cancel={SIGN_TEXTS.keepSigning}
          confirm={SIGN_TEXTS.exit}
          onCancel={screen.keepSigning}
          onConfirm={onExit}
        />
      )}
      {screen.pendingDelete && (
        <ConfirmDialog
          title={SIGN_TEXTS.deleteTitle}
          body={SIGN_TEXTS.deleteBody}
          cancel={SIGN_TEXTS.keep}
          confirm={SIGN_TEXTS.delete}
          onCancel={screen.cancelDelete}
          onConfirm={() => void screen.confirmDelete()}
        />
      )}
    </div>
  );
};
