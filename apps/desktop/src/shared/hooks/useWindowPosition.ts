import { useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { Point } from '@/shared/interfaces/point';

export const useWindowPosition = () => {
  const position = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    const appWindow = getCurrentWindow();

    void appWindow.innerPosition().then(({ x, y }) => {
      position.current = { x, y };
    });

    const unlisten = appWindow.onMoved(({ payload }) => {
      position.current = { x: payload.x, y: payload.y };
    });

    return () => {
      void unlisten.then((stop) => stop());
    };
  }, []);

  return position;
};
