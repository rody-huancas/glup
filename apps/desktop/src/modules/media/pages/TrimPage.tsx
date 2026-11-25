import { LearnModelStep } from '@/modules/background/components/LearnModelStep';
import { LEARNABLES } from '@/modules/background/constants/learnables';
import { AnimationOptionsPanel } from '@/modules/media/components/AnimationOptionsPanel';
import { MediaOption } from '@/modules/media/components/MediaOption';
import { MediaPlayer } from '@/modules/media/components/MediaPlayer';
import { TrimTimeField } from '@/modules/media/components/TrimTimeField';
import { TrimTimeline } from '@/modules/media/components/TrimTimeline';
import { ANIMATION_TEXTS, TRIM_TEXTS } from '@/modules/media/constants/texts';
import { useAnimationOutput } from '@/modules/media/hooks/useAnimationOutput';
import { usePlayer } from '@/modules/media/hooks/usePlayer';
import { useTrimEditor } from '@/modules/media/hooks/useTrimEditor';
import type { TrimTarget } from '@/modules/media/interfaces/trimTarget';
import type { TrimMode } from '@/modules/media/types/trimMode';
import { formatTime } from '@/modules/media/utils/time';
import { SaveLocationPicker } from '@/modules/settings/components/SaveLocationPicker';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Skeleton } from '@/shared/components/Skeleton';
import { useKeyDown } from '@/shared/hooks/useKeyDown';
import { useEffect, useId, useState } from 'react';

interface TrimPageProps {
  target   : TrimTarget;
  location : SaveLocation;
  onExit   : () => void;
}

const MODES: TrimMode[] = ['fast', 'exact'];

// "Recortar" (and "Video a GIF") take the whole panel, like Organizar: the player on the left and, on
// the right, the times and how to cut (or the options of the animation, its weight and its preview);
// the line of the file with its two handles under both, and «Guardar en». One column on a narrow panel.
export const TrimPage = ({ target, location, onExit }: TrimPageProps) => {
  const editor                      = useTrimEditor({ target, onExit });
  const player                      = usePlayer();
  const [leaving, setLeaving]       = useState(false);
  const [downloading, setLoading]   = useState(false);
  const modeId                      = useId();
  const { info, stretch }           = editor;
  const gif                         = target.purpose === 'gif';
  const animation                   = useAnimationOutput({ target, info, stretch, onExit });

  const requestExit = () => (editor.changed ? setLeaving(true) : onExit());
  useKeyDown({ key: 'Escape', enabled: !leaving && editor.status !== 'learning', handler: requestExit });

  // Playing the stretch stops at its end.
  const { current, playing, pause } = player;
  useEffect(() => {
    if (playing && current >= stretch.end) pause();
  }, [current, playing, stretch.end, pause]);

  const playStretch = () => (playing ? pause() : player.play(stretch.start));

  const ready   = editor.status === 'ready' && info && editor.url;
  const showKey = !gif && info?.hasVideo && editor.mode === 'fast';
  const title   = gif ? ANIMATION_TEXTS.title : TRIM_TEXTS.title;

  return (
    <div className="relative flex h-full w-full p-3">
      <div className="flex min-w-0 flex-1 flex-col rounded-[18px] border border-line bg-surface">
        <header className="flex shrink-0 items-baseline gap-2 px-4 pt-3 pb-2">
          <h1 className="text-lg font-bold tracking-[-0.01em] text-text">{title}</h1>
          <span className="min-w-0 truncate text-[13px] text-muted" title={target.path}>{target.name}</span>
        </header>
        <div className="@container flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3">
          {editor.status === 'learning' && (
            <div className="rounded-control border border-line bg-raised p-4">
              <p className="mb-2 text-[13px] text-text">{TRIM_TEXTS.learnFirst}</p>
              <LearnModelStep learnable={LEARNABLES.video} downloading={downloading} onStarted={() => setLoading(true)} onStopped={() => setLoading(false)} onReady={editor.learned} onBack={onExit} />
            </div>
          )}
          {(editor.status === 'opening' || editor.status === 'previewing') && (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
              <Skeleton className="h-full w-full rounded-control" />
              <p role="status" className="text-[12px] text-muted">{editor.status === 'previewing' ? TRIM_TEXTS.previewing : TRIM_TEXTS.opening}</p>
            </div>
          )}
          {editor.status === 'failed' && <p role="alert" className="flex flex-1 items-center justify-center text-[13px] text-muted">{TRIM_TEXTS.failed}</p>}
          {ready && (
            <>
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                <div className="flex min-h-56 min-w-0 flex-col @3xl:min-h-0">
                  {animation.preview ? (
                    <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-2 rounded-control bg-bg p-2">
                      <img src={animation.preview.url} alt={ANIMATION_TEXTS.previewAlt} className="max-h-full max-w-full object-contain" />
                      <Button variant="secondary" onClick={animation.closePreview} className="h-8 px-3 text-[12px]">{ANIMATION_TEXTS.backToVideo}</Button>
                    </div>
                  ) : (
                    <MediaPlayer info={info} url={editor.url ?? ''} player={player} onError={editor.playerFailed} />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <TrimTimeField label={TRIM_TEXTS.start} value={stretch.start} onChange={(to) => editor.move('start', to)} />
                    <TrimTimeField label={TRIM_TEXTS.end} value={stretch.end} onChange={(to) => editor.move('end', to)} />
                    <span className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
                      {TRIM_TEXTS.length}
                      <span className="flex h-8 items-center font-mono text-[13px] text-text tabular-nums">{formatTime(stretch.end - stretch.start)}</span>
                    </span>
                    <div className="flex w-full flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => editor.move('start', current)} className="h-8 px-3 text-[12px]">{TRIM_TEXTS.markStart}</Button>
                      <Button variant="secondary" onClick={() => editor.move('end', current)} className="h-8 px-3 text-[12px]">{TRIM_TEXTS.markEnd}</Button>
                      <Button variant="media" onClick={playStretch} disabled={animation.preview !== null} className="h-8 px-3 text-[12px]">{playing ? TRIM_TEXTS.pause : TRIM_TEXTS.playRange}</Button>
                    </div>
                  </div>
                  {gif ? (
                    <AnimationOptionsPanel
                      options={animation.options}
                      widths={animation.widths}
                      sourceW={info.width}
                      seconds={stretch.end - stretch.start}
                      weight={animation.weight}
                      exact={animation.exact}
                      heavy={animation.heavy}
                      previewing={animation.previewing}
                      failed={animation.failed}
                      onChange={animation.change}
                      onPreview={animation.makePreview}
                    />
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <span id={modeId} className="text-[11px] font-semibold text-muted">{TRIM_TEXTS.mode}</span>
                      <div role="radiogroup" aria-labelledby={modeId} className="grid grid-cols-2 gap-2">
                        {MODES.map((option) => <MediaOption key={option} label={TRIM_TEXTS.modes[option].label} hint={TRIM_TEXTS.modes[option].hint} selected={editor.mode === option} onChoose={() => editor.setMode(option)} />)}
                      </div>
                      {showKey && (
                        <p aria-live="polite" className="text-[12px] text-muted">
                          {editor.keyframes === null ? TRIM_TEXTS.findingKeys : TRIM_TEXTS.keyframe(formatTime(editor.realStart))}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <TrimTimeline duration={info.duration} stretch={stretch} current={current} strip={editor.strip} wave={editor.wave} onMove={editor.move} onSeek={player.seek} />
            </>
          )}
        </div>
        <footer className="flex shrink-0 items-center gap-3 border-t border-line px-4 py-3">
          <SaveLocationPicker location={location} accent="media" />
          <span className="flex-1" />
          <Button variant="secondary" onClick={requestExit} className="h-10">{TRIM_TEXTS.cancel}</Button>
          <Button
            variant="media"
            onClick={() => (gif ? animation.save(location.destination) : editor.save(location.destination))}
            disabled={!ready}
            className="h-10 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
          >
            {gif ? ANIMATION_TEXTS.save : TRIM_TEXTS.save}
          </Button>
        </footer>
      </div>
      {leaving && (
        <ConfirmDialog title={TRIM_TEXTS.exitTitle} body={TRIM_TEXTS.exitBody} confirm={TRIM_TEXTS.exitConfirm} cancel={TRIM_TEXTS.exitCancel} onConfirm={onExit} onCancel={() => setLeaving(false)} />
      )}
    </div>
  );
};
