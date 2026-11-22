import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { CURSOR_MOVED_EVENT, GET_CURSOR_POSITION } from '@/shared/constants/events';
import type { Point } from '@/shared/interfaces/point';

export const useGlobalCursor = () => {
  const cursor = useRef<Point | null>(null);

  useEffect(() => {
    let active = true;

    void invoke<Point | null>(GET_CURSOR_POSITION).then((position) => {
      if (active && position && !cursor.current) cursor.current = position;
    });

    const unlisten = listen<Point>(CURSOR_MOVED_EVENT, (event) => {
      cursor.current = event.payload;
    });

    return () => {
      active = false;
      void unlisten.then((stop) => stop());
    };
  }, []);

  return cursor;
};
