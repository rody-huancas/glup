import { useEffect, useId, useRef, useState } from 'react';
import { LearnModelStep } from '@/modules/background/components/LearnModelStep';
import { LEARNABLES } from '@/modules/background/constants/learnables';
import { LookOption } from '@/modules/dock/components/LookOption';
import { TrimTimeField } from '@/modules/media/components/TrimTimeField';
import { TrimTimeline } from '@/modules/media/components/TrimTimeline';
import { TRIM_TEXTS } from '@/modules/media/constants/texts';
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

interface TrimPageProps {
  target   : TrimTarget;
  location : SaveLocation;
  onExit   : () => void;
}

const MODES: TrimMode[] = ['fast', 'exact'];

// "Recortar" takes the whole panel, like Organizar: the player, the line of the file with its two
// handles, the times, how to cut, and «Guardar en» / «Guardar recorte».
export const TrimPage = ({ target, location, onExit }: TrimPageProps) => {
  const editor                  = useTrimEditor({ target, onExit });
  const player                  = useRef<HTMLMediaElement | null>(null);
  const [current, setCurrent]   = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [leaving, setLeaving]   = useState(false);
  const modeId                  = useId();
  const { info, stretch }       = editor;

  const requestExit = () => (editor.changed ? setLeaving(true) : onExit());
  useKeyDown({ key: 'Escape', enabled: !leaving && editor.status !== 'learning', handler: requestExit });

  // Playing the stretch stops at its end.
  useEffect(() => {
    if (playing && current >= stretch.end) {
      player.current?.pause();
      setPlaying(false);
    }
  }, [current, playing, stretch.end]);

  const seek = (to: number) => {
    if (player.current) player.current.currentTime = Math.max(0, to);
  };

  const playStretch = () => {
    const element = player.current;
    if (!element) return;
    if (playing) {
      element.pause();
      return setPlaying(false);
    }
    element.currentTime = stretch.start;
    void element.play().then(() => setPlaying(true)).catch(() => undefined);
  };

  const ready   = editor.status === 'ready' && info && editor.url;
  const showKey = info?.hasVideo && editor.mode === 'fast';

  return (
    <div className="relative flex h-full w-full p-3">
      <div className="flex min-w-0 flex-1 flex-col rounded-[18px] border border-line bg-surface">
        <header className="flex shrink-0 items-baseline gap-2 px-4 pt-3 pb-2">
          <h1 className="text-lg font-bold tracking-[-0.01em] text-text">{TRIM_TEXTS.title}</h1>
          <span className="min-w-0 truncate text-[13px] text-muted" title={target.path}>{target.name}</span>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-3">
          {editor.status === 'learning' && (
            <div className="rounded-control border border-line bg-raised p-4">
              <p className="mb-2 text-[13px] text-text">{TRIM_TEXTS.learnFirst}</p>
              <LearnModelStep learnable={LEARNABLES.video} downloading={false} onStarted={() => undefined} onStopped={() => undefined} onReady={editor.open} onBack={onExit} />
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
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-control bg-bg">
                {info.hasVideo ? (
                  <video
                    ref={(element) => {
                      player.current = element;
                    }}
                    src={editor.url ?? undefined}
                    className="max-h-full max-w-full"
                    onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
                    onPause={() => setPlaying(false)}
                    onError={editor.playerFailed}
                    controls
                  />
                ) : (
                  <audio
                    ref={(element) => {
                      player.current = element;
                    }}
                    src={editor.url ?? undefined}
                    className="w-full max-w-xl"
                    onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
                    onPause={() => setPlaying(false)}
                    onError={editor.playerFailed}
                    controls
                  />
                )}
              </div>
              <TrimTimeline duration={info.duration} stretch={stretch} current={current} strip={editor.strip} wave={editor.wave} onMove={editor.move} onSeek={seek} />
              <div className="flex flex-wrap items-end gap-3">
                <TrimTimeField label={TRIM_TEXTS.start} value={stretch.start} onChange={(to) => editor.move('start', to)} />
                <TrimTimeField label={TRIM_TEXTS.end} value={stretch.end} onChange={(to) => editor.move('end', to)} />
                <span className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
                  {TRIM_TEXTS.length}
                  <span className="flex h-8 items-center font-mono text-[13px] text-text tabular-nums">{formatTime(stretch.end - stretch.start)}</span>
                </span>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => editor.move('start', current)} className="h-8 px-3 text-[12px]">{TRIM_TEXTS.markStart}</Button>
                  <Button variant="secondary" onClick={() => editor.move('end', current)} className="h-8 px-3 text-[12px]">{TRIM_TEXTS.markEnd}</Button>
                  <Button onClick={playStretch} className="h-8 px-3 text-[12px]">{playing ? TRIM_TEXTS.pause : TRIM_TEXTS.playRange}</Button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span id={modeId} className="text-[11px] font-semibold text-muted">{TRIM_TEXTS.mode}</span>
                <div role="radiogroup" aria-labelledby={modeId} className="grid max-w-xl grid-cols-2 gap-2">
                  {MODES.map((option) => <LookOption key={option} label={TRIM_TEXTS.modes[option].label} hint={TRIM_TEXTS.modes[option].hint} selected={editor.mode === option} onChoose={() => editor.setMode(option)} />)}
                </div>
                {showKey && (
                  <p aria-live="polite" className="text-[12px] text-muted">
                    {editor.keyframes === null ? TRIM_TEXTS.findingKeys : TRIM_TEXTS.keyframe(formatTime(editor.realStart))}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
        <footer className="flex shrink-0 items-center gap-3 border-t border-line px-4 py-3">
          <SaveLocationPicker location={location} />
          <span className="flex-1" />
          <Button variant="secondary" onClick={requestExit} className="h-10">{TRIM_TEXTS.cancel}</Button>
          <Button onClick={() => editor.save(location.destination)} disabled={!ready} className="h-10 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100">
            {TRIM_TEXTS.save}
          </Button>
        </footer>
      </div>
      {leaving && (
        <ConfirmDialog title={TRIM_TEXTS.exitTitle} body={TRIM_TEXTS.exitBody} confirm={TRIM_TEXTS.exitConfirm} cancel={TRIM_TEXTS.exitCancel} onConfirm={onExit} onCancel={() => setLeaving(false)} />
      )}
    </div>
  );
};
