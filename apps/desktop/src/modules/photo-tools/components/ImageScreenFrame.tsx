import type { ReactNode } from 'react';
import { useState } from 'react';
import { PHOTO_TOOLS_TEXTS } from '@/modules/photo-tools/constants/texts';
import { SaveLocationPicker } from '@/modules/settings/components/SaveLocationPicker';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Switch } from '@/shared/components/Switch';
import { useKeyDown } from '@/shared/hooks/useKeyDown';

interface ImageScreenFrameProps {
  title    : string;
  subtitle : string;
  location : SaveLocation;
  count    : number;
  // The photo on the left (with its pager), the options on the right.
  stage    : ReactNode;
  options  : ReactNode;
  save     : string;
  canSave  : boolean;
  // Why the main button cannot be used yet (shown beside it).
  blocked? : string | null;
  changed  : boolean;
  onSave   : () => void;
  onExit   : () => void;
}

// The shell of the screens of Imágenes: the title, the photo and the options in two columns (one on a
// narrow panel), and «Guardar en», the ZIP with several photos and the main button in lilac.
export const ImageScreenFrame = ({ title, subtitle, location, count, stage, options, save, canSave, blocked = null, changed, onSave, onExit }: ImageScreenFrameProps) => {
  const [leaving, setLeaving] = useState(false);
  const requestExit           = () => (changed ? setLeaving(true) : onExit());
  useKeyDown({ key: 'Escape', enabled: !leaving, handler: requestExit });

  return (
    <div className="relative flex h-full w-full p-3">
      <div className="flex min-w-0 flex-1 flex-col rounded-[18px] border border-line bg-surface">
        <header className="flex shrink-0 items-baseline gap-2 px-4 pt-3 pb-2">
          <h1 className="text-lg font-bold tracking-[-0.01em] text-text">{title}</h1>
          <span className="min-w-0 truncate text-[13px] text-muted">{subtitle}</span>
        </header>
        <div className="@container flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-3">
          <div className="grid min-h-full grid-cols-1 gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
            <div className="flex min-h-72 min-w-0 flex-col gap-2 @3xl:min-h-0">{stage}</div>
            <div className="flex min-w-0 flex-col gap-3">{options}</div>
          </div>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-line px-4 py-3">
          <SaveLocationPicker location={location} accent="images" />
          {count > 1 && (
            <div className="min-w-48">
              <Switch accent="images" label={PHOTO_TOOLS_TEXTS.zip} checked={location.bundleZip} onChange={location.setBundleZip} />
            </div>
          )}
          <span className="flex-1" />
          {!canSave && blocked && <p role="status" className="max-w-64 text-right text-[12px] text-muted">{blocked}</p>}
          <Button variant="secondary" onClick={requestExit} className="h-10">{PHOTO_TOOLS_TEXTS.cancel}</Button>
          <Button variant="images" onClick={onSave} disabled={!canSave} className="h-10 disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted disabled:hover:brightness-100">
            {save}
          </Button>
        </footer>
      </div>
      {leaving && (
        <ConfirmDialog title={PHOTO_TOOLS_TEXTS.exitTitle} body={PHOTO_TOOLS_TEXTS.exitBody} confirm={PHOTO_TOOLS_TEXTS.exitConfirm} cancel={PHOTO_TOOLS_TEXTS.exitCancel} onConfirm={onExit} onCancel={() => setLeaving(false)} />
      )}
    </div>
  );
};
