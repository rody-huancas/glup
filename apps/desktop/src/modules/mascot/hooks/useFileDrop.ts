import { useEffect, useRef } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

interface UseFileDropParams {
  onEnter : () => void;
  onLeave : () => void;
  onDrop  : (paths: string[]) => void;
}

export const useFileDrop = (params: UseFileDropParams) => {
  const handlers = useRef(params);

  useEffect(() => {
    handlers.current = params;
  }, [params]);

  useEffect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent(({ payload }) => {
      const { onEnter, onLeave, onDrop } = handlers.current;

      if (payload.type === 'enter') onEnter();
      if (payload.type === 'leave') onLeave();
      if (payload.type === 'drop')  onDrop(payload.paths);
    });

    return () => {
      void unlisten.then((stop) => stop());
    };
  }, []);
};
