import { CreateTabs } from '@/modules/sign/components/CreateTabs';
import { DrawTab } from '@/modules/sign/components/DrawTab';
import { InkPicker } from '@/modules/sign/components/InkPicker';
import { TypeTab } from '@/modules/sign/components/TypeTab';
import { UploadTab } from '@/modules/sign/components/UploadTab';
import { CREATE_TEXTS, DRAW_INKS, INK_COLORS, UPLOAD_INKS } from '@/modules/sign/constants/sign';
import { useCreateSignature } from '@/modules/sign/hooks/useCreateSignature';
import type { SaveSignatureParams } from '@/modules/sign/interfaces/signPdf';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { Switch } from '@/shared/components/Switch';
import { CloseIcon } from '@/shared/icons/CloseIcon';

interface CreateSignatureModalProps {
  savedCount : number;
  onCancel   : () => void;
  onAccept   : (params: SaveSignatureParams) => Promise<void>;
}

// Inside the panel: Dibujar, Escribir or Subir foto; the result is a transparent PNG trimmed to its strokes.
export const CreateSignatureModal = ({ savedCount, onCancel, onAccept }: CreateSignatureModalProps) => {
  const create = useCreateSignature({ savedCount, onAccept });

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[18px] bg-black/55">
      <div role="dialog" aria-modal="true" aria-label={CREATE_TEXTS.title} className="flex w-[528px] flex-col gap-3 rounded-[18px] border border-line-strong bg-surface p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-text">{CREATE_TEXTS.title}</h2>
          <IconButton icon={CloseIcon} label={CREATE_TEXTS.cancel} onClick={onCancel} className="size-7" iconClass="size-4" />
        </div>
        <CreateTabs tab={create.tab} onChange={create.setTab} />
        {create.tab === 'upload' ? (
          <InkPicker colors={UPLOAD_INKS} color={create.uploadInk} onChange={create.setUploadInk} />
        ) : (
          <InkPicker colors={DRAW_INKS} color={create.color} onChange={create.setColor} />
        )}
        {/* <InkPicker color={create.color} onChange={create.setColor} /> */}
        {create.tab === 'draw' && <DrawTab drawing={create.drawing} />}
        {create.tab === 'type' && (
          <TypeTab name={create.name} font={create.font} ink={INK_COLORS[create.color]} onName={create.setName} onFont={create.setFont} />
        )}
        {create.tab === 'upload' && (
          <UploadTab preview={create.upload.preview} processing={create.upload.processing} error={create.upload.error} onPick={create.upload.pick} />
        )}
        <div className="flex items-center gap-2 pt-1">
          <div className="min-w-0 flex-1">
            <Switch label={create.full ? CREATE_TEXTS.full : CREATE_TEXTS.keep} checked={create.keep} disabled={create.full} onChange={create.setKeep} />
            {create.error && <p className="mt-1 text-[11px] text-[#E58A9A]">{create.error}</p>}
          </div>
          <Button variant="secondary" onClick={onCancel} className="h-9">
            {CREATE_TEXTS.cancel}
          </Button>
          <Button onClick={() => void create.accept()} disabled={!create.ready || create.busy} className="h-9 disabled:cursor-not-allowed disabled:opacity-45">
            {CREATE_TEXTS.accept}
          </Button>
        </div>
      </div>
    </div>
  );
};
