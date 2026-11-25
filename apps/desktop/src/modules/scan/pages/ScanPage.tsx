import { useState } from 'react';
import { LearnModelStep } from '@/modules/background/components/LearnModelStep';
import { LEARNABLES } from '@/modules/background/constants/learnables';
import { ScanCanvas } from '@/modules/scan/components/ScanCanvas';
import { ScanOptions } from '@/modules/scan/components/ScanOptions';
import { ScanPreview } from '@/modules/scan/components/ScanPreview';
import { ScanThumbs } from '@/modules/scan/components/ScanThumbs';
import { SCAN_TEXTS } from '@/modules/scan/constants/texts';
import { useScanEditor } from '@/modules/scan/hooks/useScanEditor';
import { useScanLearning } from '@/modules/scan/hooks/useScanLearning';
import { useScanPreview } from '@/modules/scan/hooks/useScanPreview';
import type { ScanTarget } from '@/modules/scan/interfaces/scanTarget';
import { SaveLocationPicker } from '@/modules/settings/components/SaveLocationPicker';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { IconButton } from '@/shared/components/IconButton';
import { useKeyDown } from '@/shared/hooks/useKeyDown';
import { RedoIcon } from '@/shared/icons/RedoIcon';
import { RotateLeftIcon } from '@/shared/icons/RotateLeftIcon';
import { RotateRightIcon } from '@/shared/icons/RotateRightIcon';
import { TrashIcon } from '@/shared/icons/TrashIcon';

interface ScanPageProps {
  target   : ScanTarget;
  location : SaveLocation;
  onExit   : () => void;
}

// "Escanear documento" takes the whole panel, like Organizar: the chosen photo with its corners, the
// result of that page and the options beside it, the strip of every sheet, and Guardar en / Guardar PDF.
// A photo of iPhone this Windows cannot open asks to download FFmpeg (as Convertir does) in place of the
// photo; once learned, those photos load again.
export const ScanPage = ({ target, location, onExit }: ScanPageProps) => {
  const editor                        = useScanEditor({ target, onExit });
  const preview                       = useScanPreview({ sheet: editor.current, mode: editor.mode });
  const [confirmExit, setConfirmExit] = useState(false);
  const current                       = editor.current;
  const index                         = current ? editor.sheets.indexOf(current) + 1 : 0;
  const loading                       = editor.sheets.some((sheet) => sheet.status === 'loading');
  const learn                         = useScanLearning(editor.needsTool, editor.toolLearned);

  const requestExit = () => (editor.changed ? setConfirmExit(true) : onExit());

  // While the download question is up, Esc puts it away first.
  useKeyDown({ key: 'Escape', enabled: !confirmExit, handler: learn.learning === 'asking' ? learn.later : requestExit });

  const note = editor.sheets.length === 0 ? SCAN_TEXTS.noSheets : loading ? SCAN_TEXTS.waiting : SCAN_TEXTS.ready(editor.sheets.filter((sheet) => sheet.status === 'ready').length);

  return (
    <div className="relative flex h-full w-full p-3">
      <div className="flex min-w-0 flex-1 flex-col rounded-[18px] border border-line bg-surface">
        <header className="flex shrink-0 items-center gap-2 px-4 pt-3 pb-2">
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-[-0.01em] text-text">
            {SCAN_TEXTS.title}
            <span className="ml-2 text-[13px] font-medium text-muted">{SCAN_TEXTS.count(editor.sheets.length)}</span>
          </h1>
          {current && (
            <>
              <Button variant="secondary" onClick={() => editor.detectAgain(current.id)} disabled={current.status === 'loading'} className="h-8 gap-1.5 px-3 text-[12px]">
                <RedoIcon className="size-3.5" />
                {SCAN_TEXTS.detectAgain}
              </Button>
              <IconButton icon={RotateLeftIcon} label={SCAN_TEXTS.turnLeft} onClick={() => editor.turn(current.id, 'left')} className="size-8" iconClass="size-4" />
              <IconButton icon={RotateRightIcon} label={SCAN_TEXTS.turnRight} onClick={() => editor.turn(current.id, 'right')} className="size-8" iconClass="size-4" />
              <IconButton icon={TrashIcon} label={SCAN_TEXTS.remove} onClick={() => editor.remove(current.id)} className="size-8" iconClass="size-4" />
            </>
          )}
        </header>
        <div className="flex min-h-0 flex-1 gap-4 px-4 pb-3">
          {learn.learning ? (
            <div className="min-w-0 flex-1 rounded-control border border-line bg-raised p-4">
              <LearnModelStep
                learnable={LEARNABLES.photos}
                downloading={learn.learning === 'downloading'}
                onStarted={learn.started}
                onStopped={learn.stopped}
                onReady={learn.ready}
                onBack={learn.later}
              />
            </div>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              {editor.needsTool && (
                <div role="status" className="flex shrink-0 items-center gap-3 rounded-control border border-lilac/40 bg-raised px-3 py-1.5">
                  <p className="min-w-0 flex-1 text-[12px] text-text">{SCAN_TEXTS.needsTool}</p>
                  <Button variant="secondary" onClick={learn.ask} className="h-8 shrink-0 px-3 text-[12px]">
                    {SCAN_TEXTS.learnTool}
                  </Button>
                </div>
              )}
              {current ? <ScanCanvas sheet={current} onChange={(corners) => editor.changeCorners(current.id, corners)} /> : <p className="flex flex-1 items-center justify-center text-[13px] text-muted">{SCAN_TEXTS.noSheets}</p>}
            </div>
          )}
          <aside className="scroll-thin flex w-[232px] shrink-0 flex-col gap-3 overflow-y-auto pr-1">
            <ScanPreview url={preview.url} loading={preview.loading} index={index} />
            <ScanOptions
              mode={editor.mode}
              paper={editor.paper}
              searchable={editor.searchable}
              reader={editor.reader}
              onMode={editor.setMode}
              onPaper={editor.setPaper}
              onSearchable={editor.setSearchable}
            />
          </aside>
        </div>
        <ScanThumbs sheets={editor.sheets} current={current?.id ?? null} onChoose={editor.select} onTurn={editor.turn} onRemove={editor.remove} onMove={editor.move} />
        <footer className="flex shrink-0 items-center gap-3 border-t border-line px-4 py-3">
          <SaveLocationPicker location={location} />
          <p className="min-w-0 flex-1 truncate text-right text-[12px] text-muted">{note}</p>
          <Button variant="secondary" onClick={requestExit} className="h-10">
            {SCAN_TEXTS.cancel}
          </Button>
          <Button onClick={() => editor.save(location.destination)} disabled={!editor.canSave} className="h-10 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100">
            {SCAN_TEXTS.save}
          </Button>
        </footer>
      </div>
      {confirmExit && (
        <ConfirmDialog
          title={SCAN_TEXTS.exitTitle}
          body={SCAN_TEXTS.exitBody}
          confirm={SCAN_TEXTS.exitConfirm}
          cancel={SCAN_TEXTS.exitCancel}
          onConfirm={onExit}
          onCancel={() => setConfirmExit(false)}
        />
      )}
    </div>
  );
};
