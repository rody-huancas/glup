import { useEffect, useMemo, useState } from 'react';
import { getExtension } from '@/modules/actions/utils/paths';
import { LearnModelStep } from '@/modules/background/components/LearnModelStep';
import { LEARNABLES } from '@/modules/background/constants/learnables';
import { MediaPlayer } from '@/modules/media/components/MediaPlayer';
import { StepGuide } from '@/modules/media/components/StepGuide';
import { TRIM_TEXTS } from '@/modules/media/constants/texts';
import { useMediaSource } from '@/modules/media/hooks/useMediaSource';
import { usePlayer } from '@/modules/media/hooks/usePlayer';
import type { TrimTarget } from '@/modules/media/interfaces/trimTarget';
import { formatClock } from '@/modules/media/utils/time';
import { SaveLocationPicker } from '@/modules/settings/components/SaveLocationPicker';
import type { SaveLocation } from '@/modules/settings/interfaces/saveLocation';
import { CueRow } from '@/modules/subtitles/components/CueRow';
import { SubtitleOverlay } from '@/modules/subtitles/components/SubtitleOverlay';
import { SubtitleSaveOptions } from '@/modules/subtitles/components/SubtitleSaveOptions';
import { SubtitlesListening } from '@/modules/subtitles/components/SubtitlesListening';
import { SubtitlesSetup } from '@/modules/subtitles/components/SubtitlesSetup';
import { SUBTITLES_TEXTS, TRACK_EXTENSIONS } from '@/modules/subtitles/constants/texts';
import { useSubtitlesEditor } from '@/modules/subtitles/hooks/useSubtitlesEditor';
import { cueAt } from '@/modules/subtitles/utils/cues';
import { getVideoTool } from '@/modules/video/services/videoTool';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Skeleton } from '@/shared/components/Skeleton';
import { useKeyDown } from '@/shared/hooks/useKeyDown';

interface SubtitlesPageProps {
  target   : TrimTarget;
  location : SaveLocation;
  onExit   : () => void;
}

// "Subtítulos" takes the whole panel, guided by «1 Escuchar · 2 Revisar · 3 Guardar». The video is on
// the left from the start (to see which one it is); on the right, the step: the options and «Escuchar
// el video», Glup listening, then the phrases to correct. «Guardar en», how to save and «Guardar
// subtítulos» come with the review. With the island on a side (a narrow panel), one column.
export const SubtitlesPage = ({ target, location, onExit }: SubtitlesPageProps) => {
  const editor                    = useSubtitlesEditor({ target, onExit });
  const reviewing                 = editor.stage === 'review';
  const [hasTool, setHasTool]     = useState(false);
  const source                    = useMediaSource({ path: target.path, enabled: hasTool });
  const player                    = usePlayer();
  const [leaving, setLeaving]     = useState(false);
  const [downloading, setLoading] = useState(false);
  const canEmbed                  = TRACK_EXTENSIONS.includes(getExtension(target.path));
  const mode                      = !canEmbed && editor.mode === 'embed' ? 'file' : editor.mode;

  // The video opens as soon as FFmpeg is here (the first time it comes with what listening needs).
  useEffect(() => {
    if (hasTool) return;
    void getVideoTool().then((tool) => setHasTool(tool.installed)).catch(() => undefined);
  }, [hasTool, editor.stage]);

  const requestExit = () => (editor.changed ? setLeaving(true) : editor.leave());
  useKeyDown({ key: 'Escape', enabled: !leaving && editor.stage !== 'learning', handler: requestExit });

  const showing  = cueAt(editor.cues, player.current * 1000);
  const { info } = source;
  const duration = (info?.duration ?? 0) * 1000;
  const ready    = source.status === 'ready' && info && source.url;
  const count    = useMemo(() => editor.cues.filter((cue) => cue.text.trim() !== '').length, [editor.cues]);

  return (
    <div className="relative flex h-full w-full p-3">
      <div className="flex min-w-0 flex-1 flex-col rounded-[18px] border border-line bg-surface">
        <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-3 pb-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="text-lg font-bold tracking-[-0.01em] text-text">{SUBTITLES_TEXTS.title}</h1>
            <span className="min-w-0 truncate text-[13px] text-muted" title={target.path}>{target.name}</span>
          </div>
          <div className="ml-auto">
            <StepGuide steps={SUBTITLES_TEXTS.steps} current={reviewing ? 1 : 0} />
          </div>
        </header>
        <div className="@container flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-3">
          <div className="grid min-h-full grid-cols-1 gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
            <div className="flex min-h-56 min-w-0 flex-col gap-1.5 @3xl:min-h-0">
              {ready ? (
                <MediaPlayer
                  info={info}
                  url={source.url ?? ''}
                  player={player}
                  onError={source.playerFailed}
                  overlay={(box) => (reviewing ? <SubtitleOverlay text={showing >= 0 ? editor.cues[showing].text : null} box={box} background={mode === 'burn' && editor.background} /> : null)}
                />
              ) : source.status === 'failed' ? (
                <p role="alert" className="flex flex-1 items-center justify-center rounded-control bg-bg text-[13px] text-muted">{TRIM_TEXTS.failed}</p>
              ) : !hasTool ? (
                <p className="flex flex-1 items-center justify-center rounded-control bg-bg p-4 text-center text-[13px] text-muted">{SUBTITLES_TEXTS.notLoaded}</p>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
                  <Skeleton className="h-full w-full rounded-control" />
                  <p role="status" className="text-[12px] text-muted">{source.status === 'previewing' ? TRIM_TEXTS.previewing : TRIM_TEXTS.opening}</p>
                </div>
              )}
              {info && <p className="text-[12px] text-muted tabular-nums">{SUBTITLES_TEXTS.duration(formatClock(info.duration))}</p>}
            </div>
            <div className="flex min-h-0 min-w-0 flex-col">
              {editor.stage === 'setup' && <SubtitlesSetup onListen={editor.listen} />}
              {editor.stage === 'learning' && editor.options && (
                <LearnModelStep
                  learnable={LEARNABLES[editor.options.level === 'fast' ? 'transcribe-fast' : 'transcribe-precise']}
                  downloading={downloading}
                  onStarted={() => setLoading(true)}
                  onStopped={() => setLoading(false)}
                  onReady={editor.acceptLearning}
                  onAccept={editor.acceptLearning}
                  onBack={() => editor.setStage('setup')}
                />
              )}
              {editor.stage === 'listening' && <SubtitlesListening taskId={editor.taskId} />}
              {editor.stage === 'failed' && (
                <div role="alert" className="flex flex-col gap-2">
                  <p className="text-[13px] text-text">{editor.error ?? SUBTITLES_TEXTS.failed}</p>
                  <Button variant="secondary" onClick={() => editor.setStage('setup')} className="h-9 self-start">{SUBTITLES_TEXTS.retry}</Button>
                </div>
              )}
              {reviewing && (
                <section aria-label={SUBTITLES_TEXTS.list} className="flex min-h-0 flex-1 flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-muted">{SUBTITLES_TEXTS.phrases(count)}</span>
                  <ol className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 @3xl:max-h-none">
                    {editor.cues.map((cue, index) => (
                      <CueRow
                        // By position: editing a time must not rebuild the row (and lose the focus).
                        key={index}
                        cue={cue}
                        index={index}
                        current={index === showing}
                        last={index === editor.cues.length - 1}
                        onFocus={() => player.seek(cue.start / 1000 + 0.01)}
                        onText={(text) => editor.editor.edit(index, text)}
                        onTime={(which, seconds) => editor.editor.retime(index, which, seconds * 1000, duration || cue.end)}
                        onMerge={() => editor.editor.merge(index)}
                        onSplit={(at) => editor.editor.split(index, at)}
                        onRemove={() => editor.editor.remove(index)}
                      />
                    ))}
                  </ol>
                </section>
              )}
            </div>
          </div>
        </div>
        <footer className="flex shrink-0 flex-col gap-3 border-t border-line px-4 py-3">
          {reviewing && <SubtitleSaveOptions mode={mode} background={editor.background} canEmbed={canEmbed} onMode={editor.setMode} onBackground={editor.setBackground} />}
          <div className="flex items-center gap-3">
            {reviewing && <SaveLocationPicker location={location} accent="media" />}
            <span className="flex-1" />
            <Button variant="secondary" onClick={requestExit} className="h-10">{SUBTITLES_TEXTS.cancel}</Button>
            {reviewing && (
              <Button variant="media" onClick={() => editor.save(location.destination)} disabled={count === 0} className="h-10 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100">
                {SUBTITLES_TEXTS.save}
              </Button>
            )}
          </div>
        </footer>
      </div>
      {leaving && (
        <ConfirmDialog title={SUBTITLES_TEXTS.exitTitle} body={SUBTITLES_TEXTS.exitBody} confirm={SUBTITLES_TEXTS.exitConfirm} cancel={SUBTITLES_TEXTS.exitCancel} onConfirm={editor.leave} onCancel={() => setLeaving(false)} />
      )}
    </div>
  );
};
