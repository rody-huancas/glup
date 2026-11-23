import { ActionsGrid } from '@/modules/actions/components/ActionsGrid';
import { CloseButton } from '@/modules/actions/components/CloseButton';
import { FormatPicker } from '@/modules/actions/components/FormatPicker';
import type { ActionsPhase } from '@/modules/actions/types/actionsPhase';
import type { ActionFlow } from '@/modules/actions/interfaces/actionFlow';
import type { FileSelection } from '@/modules/actions/interfaces/fileSelection';
import { getSelectionIcon } from '@/modules/actions/utils/fileIcon';
import { canBundle } from '@/modules/actions/utils/formats';
import { getPhaseMessage } from '@/modules/actions/utils/phase';
import { getActionsTitle, getSelectionSummary } from '@/modules/actions/utils/summary';
import { BackgroundStep } from '@/modules/background/components/BackgroundStep';
import { LearnModelStep } from '@/modules/background/components/LearnModelStep';
import { LEARNABLES } from '@/modules/background/constants/learnables';
import { IdFormatStep } from '@/modules/id-photo/components/IdFormatStep';
import { IdPreviewStep } from '@/modules/id-photo/components/IdPreviewStep';
import { MergeOrderStep } from '@/modules/pdf/components/MergeOrderStep';
import { NumberingStep } from '@/modules/pdf/components/NumberingStep';
import { PageImageStep } from '@/modules/pdf/components/PageImageStep';
import { PageSelectionStep } from '@/modules/pdf/components/PageSelectionStep';
import { ProtectStep } from '@/modules/pdf/components/ProtectStep';
import { ReduceStep } from '@/modules/pdf/components/ReduceStep';
import { SplitStep } from '@/modules/pdf/components/SplitStep';
import { UnlockStep } from '@/modules/pdf/components/UnlockStep';
import { WatermarkStep } from '@/modules/pdf/components/WatermarkStep';
import { BundleZipToggle } from '@/modules/settings/components/BundleZipToggle';
import { SaveLocationPicker } from '@/modules/settings/components/SaveLocationPicker';
import { TranscribeStep } from '@/modules/transcribe/components/TranscribeStep';
import { VideoGoalStep } from '@/modules/video/components/VideoGoalStep';
import { FileChip } from '@/shared/components/FileChip';

interface ActionsPanelProps {
  selection : FileSelection;
  flow      : ActionFlow;
}

// Steps where the zip switch has no effect hide it (merge gives one PDF, picked pages too).
const NO_BUNDLE_STEPS: ActionsPhase[] = ['order', 'pages', 'result', 'learn-model', 'learning-model', 'unlock', 'id-format', 'id-preview', 'transcribe'];

// The shortest PDF chosen, when every page count is known (numbering cannot start past it).
const shortestPdf = (selection: FileSelection): number | null =>
  selection.files.every((file) => file.pages !== null) ? Math.min(...selection.files.map((file) => file.pages ?? 0)) : null;

const ActionsStep = ({ selection, flow }: ActionsPanelProps) => {
  if (flow.phase === 'formats') {
    return <FormatPicker selection={selection} onChoose={flow.chooseFormat} onBack={flow.back} />;
  }

  if (flow.phase === 'order') {
    return <MergeOrderStep files={selection.files} onMerge={flow.merge} onBack={flow.back} />;
  }

  if (flow.phase === 'split') {
    return <SplitStep onSplitAll={flow.splitAll} onPick={flow.pickPages} onBack={flow.back} />;
  }

  if (flow.phase === 'pages') {
    return <PageSelectionStep path={selection.paths[0]} pages={selection.files[0]?.pages ?? null} onCreate={flow.splitPages} onBack={flow.back} />;
  }

  // The level chosen is remembered for next time.
  if (flow.phase === 'reduce') {
    const reduce = flow.reducePdf;
    const remember = flow.saveLocation.setReduceLevel;

    return (
      <ReduceStep
        lastLevel={flow.saveLocation.reduceLevel}
        onReduce={(options) => {
          remember(options.level);
          reduce(options);
        }}
        onBack={flow.back}
      />
    );
  }

  if (flow.phase === 'image-format') {
    return <PageImageStep onChoose={flow.toImages} onBack={flow.back} />;
  }

  if (flow.phase === 'learn-model' || flow.phase === 'learning-model') {
    return (
      <LearnModelStep
        learnable={LEARNABLES[flow.learnable]}
        downloading={flow.phase === 'learning-model'}
        onStarted={flow.modelStarted}
        onStopped={flow.modelStopped}
        onReady={flow.modelReady}
        onBack={flow.back}
        onAccept={flow.chained ? flow.acceptLearning : undefined}
      />
    );
  }

  if (flow.phase === 'background') {
    return <BackgroundStep onChoose={flow.chooseBackground} onBack={flow.back} />;
  }

  if (flow.phase === 'transcribe') {
    return <TranscribeStep files={selection.files} onStart={flow.startTranscribe} onBack={flow.back} />;
  }

  if (flow.phase === 'id-format') {
    return <IdFormatStep onNext={flow.chooseIdFormat} onBack={flow.back} />;
  }

  if (flow.phase === 'id-preview' && flow.idChoice) {
    return <IdPreviewStep path={selection.paths[0]} choice={flow.idChoice} onDone={flow.saveIdPhoto} onBack={flow.back} />;
  }

  if (flow.phase === 'video') {
    return <VideoGoalStep paths={selection.paths} onReduce={flow.reduceVideo} onBack={flow.back} />;
  }

  if (flow.phase === 'protect') {
    return <ProtectStep onProtect={flow.protectPdf} onBack={flow.back} />;
  }

  if (flow.phase === 'unlock') {
    return <UnlockStep onUnlock={flow.unlockPdf} onBack={flow.back} />;
  }

  if (flow.phase === 'watermark') {
    return <WatermarkStep path={selection.paths[0]} onConfirm={flow.watermarkPdf} onBack={flow.back} />;
  }

  if (flow.phase === 'numbering') {
    return <NumberingStep path={selection.paths[0]} total={shortestPdf(selection)} onConfirm={flow.numberPages} onBack={flow.back} />;
  }

  return (
    <>
      <h2 className="mt-3 text-[15px] font-semibold text-text">{getActionsTitle(selection)}</h2>
      <div className="mt-2.5">
        <ActionsGrid actions={selection.actions} message={getPhaseMessage(flow.phase)} onChoose={flow.choose} />
        {/* Real runs show in the task card; only "Esto lo aprendo pronto" stays here. */}
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
          {canBundle(selection) && !NO_BUNDLE_STEPS.includes(flow.phase) && <BundleZipToggle location={flow.saveLocation} disabled={locked} />}
        </div>
      )}
      <ActionsStep selection={selection} flow={flow} />
    </div>
  );
};
