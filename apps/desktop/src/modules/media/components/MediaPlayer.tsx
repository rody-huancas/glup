import type { ReactNode } from 'react';
import { PlayerControls } from '@/modules/media/components/PlayerControls';
import { usePictureBox } from '@/modules/media/hooks/usePictureBox';
import type { usePlayer } from '@/modules/media/hooks/usePlayer';
import type { MediaInfo } from '@/modules/media/interfaces/mediaInfo';
import type { PictureBox } from '@/modules/media/interfaces/pictureBox';

interface MediaPlayerProps {
  info     : MediaInfo;
  url      : string;
  player   : ReturnType<typeof usePlayer>;
  onError  : () => void;
  // Drawn over the picture at its size (the subtitles while it plays).
  overlay? : (box: PictureBox) => ReactNode;
}

// The file with Glup's own controls under it (the webview's ones would cover what goes over the
// picture); a sound has only the controls.
export const MediaPlayer = ({ info, url, player, onError, overlay }: MediaPlayerProps) => {
  const { box, measure } = usePictureBox();
  const toggle           = () => (player.playing ? player.pause() : player.play());

  const attach = (node: HTMLMediaElement | null) => {
    player.attach(node);
    measure(node);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {info.hasVideo ? (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-control bg-bg">
          <div className="relative flex max-h-full max-w-full">
            <video ref={attach} src={url} className="max-h-full max-w-full" onError={onError} onClick={toggle} {...player.handlers} />
            {box && overlay?.(box)}
          </div>
        </div>
      ) : (
        <audio ref={attach} src={url} className="hidden" onError={onError} {...player.handlers} />
      )}
      <PlayerControls current={player.current} duration={info.duration} playing={player.playing} onToggle={toggle} onSeek={player.seek} />
    </div>
  );
};
