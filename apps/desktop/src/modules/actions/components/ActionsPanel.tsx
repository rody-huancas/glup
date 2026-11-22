import { ActionResultView } from '@/modules/actions/components/ActionResultView';
import { ActionsGrid } from '@/modules/actions/components/ActionsGrid';
import { CloseButton } from '@/modules/actions/components/CloseButton';
import { FormatPicker } from '@/modules/actions/components/FormatPicker';
import { WorkingStatus } from '@/modules/actions/components/WorkingStatus';
import type { ActionFlow } from '@/modules/actions/interfaces/actionFlow';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import { getSelectionIcon } from '@/modules/actions/utils/fileIcon';
import { canBundle } from '@/modules/actions/utils/formats';
import { getPhaseMessage } from '@/modules/actions/utils/phase';
import { getActionsTitle, getSelectionSummary } from '@/modules/actions/utils/summary';
import { BundleZipToggle } from '@/modules/settings/components/BundleZipToggle';
import { SaveLocationPicker } from '@/modules/settings/components/SaveLocationPicker';
import { FileChip } from '@/shared/components/FileChip';

interface ActionsPanelProps {
  selection : FileSelection;
  flow      : ActionFlow;
}

const ActionsStep = ({ selection, flow }: ActionsPanelProps) => {
  if (flow.phase === 'formats') {
    return <FormatPicker selection={selection} onChoose={flow.chooseFormat} onBack={flow.back} />;
  }

  if (flow.phase === 'result' && flow.result) {
    return <ActionResultView result={flow.result} onOpen={flow.openOutput} onReveal={flow.revealOutput} />;
  }

  return (
    <>
      <h2 className="mt-3 text-[15px] font-semibold text-text">{getActionsTitle(selection)}</h2>
      <div className="mt-2.5">
        {flow.phase === 'working' && flow.running ? (
          <WorkingStatus
            progress={flow.progress}
            fileCount={selection.files.length}
            cancelling={flow.cancelling}
            onCancel={flow.cancel}
          />
        ) : (
          <ActionsGrid actions={selection.actions} message={getPhaseMessage(flow.phase, flow.progress)} onChoose={flow.choose} />
        )}
      </div>
    </>
  );
};

// Where to save (and whether to bundle) is chosen before running, right under the files.
export const ActionsPanel = ({ selection, flow }: ActionsPanelProps) => {
  const { label, size } = getSelectionSummary(selection);
  const locked          = flow.phase === 'working' || flow.phase === 'learning';

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5">
        <FileChip icon={getSelectionIcon(selection.type)} label={label} size={size} />
        <CloseButton onClose={flow.close} />
      </div>
      {flow.phase !== 'result' && (
        <div className="mt-2.5 flex flex-col gap-2">
          <SaveLocationPicker location={flow.saveLocation} disabled={locked} />
          {canBundle(selection) && <BundleZipToggle location={flow.saveLocation} disabled={locked} />}
        </div>
      )}
      <ActionsStep selection={selection} flow={flow} />
      {/* {flow.phase !== 'result' && (
        <div className="mt-2.5">
          <SaveLocationPicker location={flow.saveLocation} disabled={flow.phase === 'working' || flow.phase === 'learning'} />
        </div>
      )} */}
    </div>
  );
};
