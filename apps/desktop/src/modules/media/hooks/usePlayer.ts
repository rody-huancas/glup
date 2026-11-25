import { useCallback, useRef, useState } from 'react';

// The <video> or <audio> of a screen: where it is, whether it plays, and taking it somewhere.
export const usePlayer = () => {
  const element               = useRef<HTMLMediaElement | null>(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  const attach = useCallback((node: HTMLMediaElement | null) => {
    element.current = node;
  }, []);

  const seek = useCallback((to: number) => {
    if (!element.current) return;
    element.current.currentTime = Math.max(0, to);
    setCurrent(Math.max(0, to));
  }, []);

  const pause = useCallback(() => {
    element.current?.pause();
    setPlaying(false);
  }, []);

  // From `from` (seconds), or from where it is.
  const play = useCallback((from?: number) => {
    const node = element.current;
    if (!node) return;
    if (from !== undefined) node.currentTime = from;
    void node.play().then(() => setPlaying(true)).catch(() => undefined);
  }, []);

  const handlers = {
    onTimeUpdate : (event: { currentTarget: HTMLMediaElement }) => setCurrent(event.currentTarget.currentTime),
    onPause      : () => setPlaying(false),
    onPlay       : () => setPlaying(true),
  };

  return { attach, current, playing, seek, play, pause, handlers };
};
