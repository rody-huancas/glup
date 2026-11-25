import { useId } from 'react';
import { OptionGroup } from '@/modules/pdf/components/OptionGroup';
import { ImageScreenFrame } from '@/modules/photo-tools/components/ImageScreenFrame';
import { PhotoPager } from '@/modules/photo-tools/components/PhotoPager';
import { PHOTO_TOOLS_TEXTS } from '@/modules/photo-tools/constants/texts';
import { usePhotoPreview } from '@/modules/photo-tools/hooks/usePhotoPreview';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import { ContainStage } from '@/modules/social/components/ContainStage';
import { CropStage } from '@/modules/social/components/CropStage';
import { SizePicker } from '@/modules/social/components/SizePicker';
import { FORMATS, SOCIAL_TEXTS } from '@/modules/social/constants/texts';
import { useSocialEditor } from '@/modules/social/hooks/useSocialEditor';
import type { SocialFit } from '@/modules/social/types/socialFit';
import { MAX_ZOOM } from '@/modules/social/utils/frame';
import { ChoiceCard } from '@/shared/components/ChoiceCard';
import { Skeleton } from '@/shared/components/Skeleton';
import { Switch } from '@/shared/components/Switch';

interface SocialPageProps {
  paths    : string[];
  location : SaveLocation;
  onExit   : () => void;
}

const FITS: SocialFit[] = ['crop', 'contain'];

// "Tamaño para redes" takes the whole panel: the photo with the frame of the size (or as it fits whole)
// on the left, and on the right the network, the size, how it fits, the fill and the format.
export const SocialPage = ({ paths, location, onExit }: SocialPageProps) => {
  const editor  = useSocialEditor({ paths, location, onExit });
  const preview = usePhotoPreview(paths[editor.index] ?? null);
  const fitId   = useId();
  const fillId  = useId();

  const stage = (
    <>
      {preview.url ? (
        editor.fit === 'crop' ? (
          <CropStage url={preview.url} frame={editor.frame} zoom={editor.zoomLevel} onMove={editor.move} onZoom={editor.zoom} />
        ) : (
          <ContainStage url={preview.url} aspect={editor.size.width / editor.size.height} fill={editor.fill} blur={editor.blur} />
        )
      ) : preview.failed ? (
        <p role="alert" className="flex flex-1 items-center justify-center rounded-control bg-bg text-[13px] text-muted">{PHOTO_TOOLS_TEXTS.failed}</p>
      ) : (
        <Skeleton className="min-h-60 flex-1 rounded-control" />
      )}
      {editor.fit === 'crop' && (
        <label className="flex items-center gap-2 text-[12px] font-semibold text-muted">
          {SOCIAL_TEXTS.zoom}
          <input type="range" min={1} max={MAX_ZOOM} step={0.05} value={editor.zoomLevel} onChange={(event) => editor.zoom(Number(event.target.value))} className="min-w-0 flex-1 cursor-pointer accent-fam-images" />
        </label>
      )}
      <PhotoPager index={editor.index} total={paths.length} onChange={editor.setIndex} />
    </>
  );

  const options = (
    <>
      <SizePicker networkId={editor.networkId} sizeId={editor.sizeId} custom={editor.custom} onNetwork={editor.chooseNetwork} onSize={editor.setSizeId} onSide={editor.setCustomSide} onLock={editor.setLocked} />
      <p className="text-[12px] text-muted tabular-nums">{SOCIAL_TEXTS.output(editor.size.width, editor.size.height)}</p>
      <div className="flex flex-col gap-1.5">
        <span id={fitId} className="text-[11px] font-semibold text-muted">{SOCIAL_TEXTS.fit}</span>
        <div role="radiogroup" aria-labelledby={fitId} className="grid grid-cols-2 gap-2">
          {FITS.map((fit) => <ChoiceCard key={fit} accent="images" label={SOCIAL_TEXTS.fits[fit].label} hint={SOCIAL_TEXTS.fits[fit].hint} selected={editor.fit === fit} onChoose={() => editor.setFit(fit)} />)}
        </div>
      </div>
      {editor.fit === 'contain' && (
        <div className="flex flex-col gap-1.5">
          <span id={fillId} className="text-[11px] font-semibold text-muted">{SOCIAL_TEXTS.fill}</span>
          <div role="radiogroup" aria-labelledby={fillId} className="grid grid-cols-2 gap-2">
            <ChoiceCard accent="images" label={SOCIAL_TEXTS.color} hint={SOCIAL_TEXTS.colorHint} selected={!editor.blur} onChoose={() => editor.setBlur(false)} />
            <ChoiceCard accent="images" label={SOCIAL_TEXTS.blur} hint={SOCIAL_TEXTS.blurHint} selected={editor.blur} onChoose={() => editor.setBlur(true)} />
          </div>
          {!editor.blur && (
            <input type="color" value={editor.fill} onChange={(event) => editor.setFill(event.target.value)} aria-label={SOCIAL_TEXTS.colorField} className="h-9 w-20 cursor-pointer rounded-control border border-line-strong bg-raised" />
          )}
        </div>
      )}
      <OptionGroup label={SOCIAL_TEXTS.format} options={FORMATS} labels={SOCIAL_TEXTS.formats} value={editor.format} onChange={editor.setFormat} />
      {paths.length > 1 && editor.fit === 'crop' && <Switch accent="images" label={SOCIAL_TEXTS.onlyThis} hint={SOCIAL_TEXTS.onlyThisHint} checked={editor.onlyThis} onChange={editor.setOnlyThis} />}
    </>
  );

  return (
    <ImageScreenFrame
      title={SOCIAL_TEXTS.title}
      subtitle={SOCIAL_TEXTS.subtitle(paths.length)}
      location={location}
      count={paths.length}
      stage={stage}
      options={options}
      save={SOCIAL_TEXTS.save}
      canSave={editor.valid}
      changed={editor.changed}
      onSave={editor.save}
      onExit={onExit}
    />
  );
};
