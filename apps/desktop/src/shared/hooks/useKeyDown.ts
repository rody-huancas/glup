import { useEffect, useRef } from 'react';

interface UseKeyDownParams {
  key     : string;
  enabled : boolean;
  handler : () => void;
}

export const useKeyDown = ({ key, enabled, handler }: UseKeyDownParams) => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === key) handlerRef.current();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, enabled]);
};
