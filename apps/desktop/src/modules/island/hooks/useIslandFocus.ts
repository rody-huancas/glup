import { useCallback, useRef } from 'react';
import { setIslandFocus } from '@/modules/island/utils/islandWindow';

// The island never steals focus on its own; it borrows it on demand and gives it back when collapsing.
export const useIslandFocus = () => {
  const focused = useRef(false);

  const takeFocus = useCallback(() => {
    if (focused.current) return;

    focused.current = true;
    void setIslandFocus(true);
  }, []);

  const releaseFocus = useCallback(() => {
    if (!focused.current) return;

    focused.current = false;
    void setIslandFocus(false);
  }, []);

  return { takeFocus, releaseFocus };
};
