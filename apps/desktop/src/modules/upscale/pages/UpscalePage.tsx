import { useId } from 'react';
import { LearnModelStep } from '@/modules/background/components/LearnModelStep';
import { OptionGroup } from '@/modules/pdf/components/OptionGroup';
import { ImageScreenFrame } from '@/modules/photo-tools/components/ImageScreenFrame';
import { PhotoPager } from '@/modules/photo-tools/components/PhotoPager';
import { usePhotoPreview } from '@/modules/photo-tools/hooks/usePhotoPreview';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import { BeforeAfter } from '@/modules/upscale/components/BeforeAfter';
import { UPSCALE_TEXTS } from '@/modules/upscale/constants/texts';
import { learnableOf, useUpscaleEditor } from '@/modules/upscale/hooks/useUpscaleEditor';
import type { UpscaleLevel } from '@/modules/upscale/types/upscaleLevel';
import { Button } from '@/shared/components/Button';
import { ChoiceCard } from '@/shared/components/ChoiceCard';
import { Skeleton } from '@/shared/components/Skeleton';

interface UpscalePageProps {
  paths    : string[];
  location : SaveLocation;
  onExit   : () => void;
}

const LEVELS: UpscaleLevel[] = ['fast', 'detail'];
const SCALES = ['1', '2', '4'] as const;
const light  = 'h-9 rounded-full border border-fam-images/50 bg-bg/85 px-4 text-[12px] font-semibold text-fam-images shadow-sm backdrop-blur hover:bg-fam-images-dark disabled:cursor-not-allowed disabled:opacity-60';

// "Mejorar calidad" takes the whole panel: the photo from the start on the left (with «Ver antes y
// después» over it, which puts the curtain on a piece of it), and on the right the level (downloaded
// the first time), how much bigger, and the size it gives.
export const UpscalePage = ({ paths, location, onExit }: UpscalePageProps) => {
  const editor  = useUpscaleEditor({ paths, location, onExit });
  const photo   = usePhotoPreview(paths[editor.index] ?? null);
  const levelId = useId();

  const stage = (
    <>
      <div className="relative flex min-h-60 flex-1 flex-col items-center justify-center gap-2 rounded-control bg-bg p-2">
        {editor.preview ? (
          <>
            <BeforeAfter url={editor.preview} />
            <p className="text-[11px] text-muted">{UPSCALE_TEXTS.piece}</p>
          </>
        ) : photo.url ? (
          <img src={photo.url} alt="" className="max-h-[60vh] max-w-full object-contain @3xl:max-h-[calc(100vh-260px)]" />
        ) : (
          <Skeleton className="h-full min-h-60 w-full rounded-control" />
        )}
        <div className="absolute top-3 left-1/2 -translate-x-1/2">
          {editor.preview ? (
            <Button variant="secondary" onClick={editor.closePreview} className={light}>{UPSCALE_TEXTS.backToPhoto}</Button>
          ) : (
            <Button variant="secondary" onClick={editor.compare} disabled={!editor.learned || editor.comparing} className={light}>
              {editor.comparing ? UPSCALE_TEXTS.comparing : UPSCALE_TEXTS.compare}
            </Button>
          )}
        </div>
      </div>
      {editor.failed && <p role="alert" className="text-center text-[12px] text-danger">{UPSCALE_TEXTS.failed}</p>}
      <PhotoPager index={editor.index} total={paths.length} onChange={editor.setIndex} />
    </>
  );

  const options = (
    <>
      <div className="flex flex-col gap-1.5">
        <span id={levelId} className="text-[11px] font-semibold text-muted">{UPSCALE_TEXTS.level}</span>
        <div role="radiogroup" aria-labelledby={levelId} className="grid grid-cols-2 gap-2">
          {LEVELS.map((level) => <ChoiceCard key={level} accent="images" label={UPSCALE_TEXTS.levels[level].label} hint={UPSCALE_TEXTS.levels[level].hint} selected={editor.level === level} onChoose={() => editor.setLevel(level)} />)}
        </div>
      </div>
      {editor.status && !editor.learned && (
        <div className="rounded-control border border-fam-images/40 bg-fam-images-dark p-3">
          <LearnModelStep
            learnable={learnableOf(editor.level)}
            downloading={editor.downloading}
            accent="images"
            onStarted={() => editor.setLoading(true)}
            onStopped={() => editor.setLoading(false)}
            onReady={() => {
              editor.setLoading(false);
              editor.refresh();
            }}
            onBack={onExit}
          />
        </div>
      )}
      <OptionGroup label={UPSCALE_TEXTS.scale} options={[...SCALES]} labels={UPSCALE_TEXTS.scales} value={String(editor.scale) as (typeof SCALES)[number]} onChange={(value) => editor.setScale(value === '2' ? 2 : value === '4' ? 4 : 1)} />
      {editor.scale === 1 && <p className="text-[12px] text-muted">{UPSCALE_TEXTS.sameHint}</p>}
      {editor.output && (
        <p className="text-[12px] text-muted tabular-nums">
          {editor.scale === 1 ? UPSCALE_TEXTS.sameOutput(editor.output[0], editor.output[1]) : UPSCALE_TEXTS.output(editor.output[0], editor.output[1])}
        </p>
      )}
      {editor.tooBig > 0 && <p role="alert" className="text-[12px] text-danger">{editor.allTooBig ? UPSCALE_TEXTS.allTooBig : UPSCALE_TEXTS.tooBig(editor.tooBig)}</p>}
    </>
  );

  return (
    <ImageScreenFrame
      title={UPSCALE_TEXTS.title}
      subtitle={UPSCALE_TEXTS.subtitle(paths.length)}
      location={location}
      count={paths.length}
      stage={stage}
      options={options}
      save={UPSCALE_TEXTS.save}
      canSave={editor.learned && !editor.allTooBig}
      blocked={!editor.learned ? UPSCALE_TEXTS.needsModel(UPSCALE_TEXTS.levels[editor.level].label) : editor.allTooBig ? UPSCALE_TEXTS.allTooBig : null}
      changed={false}
      onSave={editor.save}
      onExit={onExit}
    />
  );
};
