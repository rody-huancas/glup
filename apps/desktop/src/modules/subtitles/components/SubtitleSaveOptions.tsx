import { MediaOption } from '@/modules/media/components/MediaOption';
import { SUBTITLES_TEXTS } from '@/modules/subtitles/constants/texts';
import type { SubtitleMode } from '@/modules/subtitles/types/subtitleMode';
import { Switch } from '@/shared/components/Switch';
import { useId } from 'react';

interface SubtitleSaveOptionsProps {
  mode          : SubtitleMode;
  background    : boolean;
  // MP4, MOV, MKV or WebM: they take a track inside.
  canEmbed      : boolean;
  onMode        : (mode: SubtitleMode) => void;
  onBackground  : (background: boolean) => void;
}

const MODES: SubtitleMode[] = ['file', 'embed', 'burn'];

// A .srt apart (by default), a track that can be switched off, or drawn on the picture (with «Fondo»).
export const SubtitleSaveOptions = ({ mode, background, canEmbed, onMode, onBackground }: SubtitleSaveOptionsProps) => {
  const labelId = useId();
  const modes   = MODES.filter((each) => each !== 'embed' || canEmbed);

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-[11px] font-semibold text-muted">{SUBTITLES_TEXTS.saveAs}</span>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2 [&>*]:min-w-44">
        {modes.map((each) => <MediaOption key={each} label={SUBTITLES_TEXTS.modes[each].label} hint={SUBTITLES_TEXTS.modes[each].hint} selected={mode === each} onChoose={() => onMode(each)} />)}
      </div>
      {!canEmbed && <p className="text-[11px] text-muted">{SUBTITLES_TEXTS.embedOnly}</p>}
      {mode === 'burn' && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-56">
            <Switch label={SUBTITLES_TEXTS.background} hint={SUBTITLES_TEXTS.backgroundHint} checked={background} onChange={onBackground} />
          </div>
          <p className="text-[11px] text-muted">{SUBTITLES_TEXTS.burnNote}</p>
        </div>
      )}
    </div>
  );
};
