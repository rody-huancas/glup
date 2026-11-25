import { MarkControls } from '@/modules/photo-mark/components/MarkControls';
import { MarkPreview } from '@/modules/photo-mark/components/MarkPreview';
import { MARK_TEXTS } from '@/modules/photo-mark/constants/texts';
import { usePhotoMarkEditor } from '@/modules/photo-mark/hooks/usePhotoMarkEditor';
import { ImageScreenFrame } from '@/modules/photo-tools/components/ImageScreenFrame';
import { PhotoPager } from '@/modules/photo-tools/components/PhotoPager';
import { usePhotoPreview } from '@/modules/photo-tools/hooks/usePhotoPreview';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';

interface PhotoMarkPageProps {
  paths    : string[];
  location : SaveLocation;
  onExit   : () => void;
}

// "Marca de agua" takes the whole panel: the photo with the mark live on the left (any of them, with the
// arrows), the mark's options on the right.
export const PhotoMarkPage = ({ paths, location, onExit }: PhotoMarkPageProps) => {
  const editor  = usePhotoMarkEditor({ paths, location, onExit });
  const preview = usePhotoPreview(paths[editor.index] ?? null);

  return (
    <ImageScreenFrame
      title={MARK_TEXTS.title}
      subtitle={MARK_TEXTS.subtitle(paths.length)}
      location={location}
      count={paths.length}
      stage={(
        <>
          <MarkPreview url={preview.url} options={editor.options} size={editor.size} />
          <PhotoPager index={editor.index} total={paths.length} onChange={editor.setIndex} />
        </>
      )}
      options={(
        <>
          <MarkControls options={editor.options} onChange={editor.change} onLogo={editor.chooseLogo} />
          {!editor.ready && <p className="text-[12px] text-muted">{MARK_TEXTS.needsMark}</p>}
        </>
      )}
      save={MARK_TEXTS.save}
      canSave={editor.ready}
      changed={editor.changed}
      onSave={editor.save}
      onExit={onExit}
    />
  );
};
