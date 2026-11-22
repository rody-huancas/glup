import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';

export const useTauriEvent = <T>(event: string, handler: (payload: T) => void) => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const unlisten = listen<T>(event, ({ payload }) => handlerRef.current(payload));

    return () => {
      void unlisten.then((stop) => stop());
    };
  }, [event]);
};
