import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaInfo } from '@/modules/media/interfaces/mediaInfo';
import { closeMedia, makeMediaPreview, openMedia } from '@/modules/media/services/media';

type SourceStatus = 'idle' | 'opening' | 'previewing' | 'ready' | 'failed';

interface MediaSourceParams {
  path    : string;
  // Opened once FFmpeg is here.
  enabled : boolean;
}

// The file for a player: served as it is when the webview plays it, a light copy otherwise (or when it
// fails to play after all). What Rust serves and its copies go when the screen does.
export const useMediaSource = ({ path, enabled }: MediaSourceParams) => {
  const [status, setStatus] = useState<SourceStatus>('idle');
  const [info, setInfo]     = useState<MediaInfo | null>(null);
  const [url, setUrl]       = useState<string | null>(null);
  const previewed           = useRef(false);

  const preview = useCallback(() => {
    previewed.current = true;
    setStatus('previewing');
    void makeMediaPreview(path)
      .then((next) => {
        setUrl(next);
        setStatus('ready');
      })
      .catch(() => setStatus('failed'));
  }, [path]);

  useEffect(() => {
    if (!enabled) return;
    setStatus('opening');
    void openMedia(path)
      .then((opened) => {
        setInfo(opened.info);
        if (!opened.url) return preview();
        setUrl(opened.url);
        setStatus('ready');
      })
      .catch(() => setStatus('failed'));
  }, [enabled, path, preview]);

  const playerFailed = useCallback(() => (previewed.current ? setStatus('failed') : preview()), [preview]);

  useEffect(() => () => {
    void closeMedia().catch(() => undefined);
  }, []);

  return { status, info, url, playerFailed };
};
