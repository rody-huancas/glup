import { useCallback, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { moveFavoriteTool } from '@/modules/tools/store/favoritesStore';

// Reordering by dragging the grip with the pointer (the webview's HTML drag is taken by file drops):
// the item under the pointer marks where it lands; letting go moves it there.
export const useFavoriteDrag = () => {
  const list                  = useRef<HTMLUListElement | null>(null);
  const [from, setFrom]       = useState<number | null>(null);
  const [target, setTarget]   = useState<number | null>(null);

  const indexAt = (y: number): number => {
    const items = Array.from(list.current?.children ?? []);
    const below = items.findIndex((item) => y < item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2);
    return below === -1 ? items.length : below;
  };

  const grab = useCallback((index: number) => (event: PointerEvent<HTMLButtonElement>) => {
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    setFrom(index);
    setTarget(index);

    const move = (moved: globalThis.PointerEvent) => setTarget(indexAt(moved.clientY));
    const drop = (ended: globalThis.PointerEvent) => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', drop);
      handle.removeEventListener('pointercancel', drop);
      const landing = indexAt(ended.clientY);
      // Landing below itself counts one less (it left its own place).
      const to      = landing > index ? landing - 1 : landing;
      setFrom(null);
      setTarget(null);
      if (ended.type === 'pointerup' && to !== index) void moveFavoriteTool(index, to);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', drop);
    handle.addEventListener('pointercancel', drop);
  }, []);

  return { list, from, target, grab };
};
