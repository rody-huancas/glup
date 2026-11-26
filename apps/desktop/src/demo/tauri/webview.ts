import { listenTo } from '@/demo/bus';

export const DRAG_DROP_EVENT = 'demo-drag-drop';

type DropHandler = (event: { payload: { type: 'enter' | 'over' | 'leave' | 'drop'; paths: string[] } }) => void;

export const getCurrentWebview = () => ({
  onDragDropEvent: (handler: DropHandler): Promise<() => void> => Promise.resolve(listenTo(DRAG_DROP_EVENT, ({ payload }) => handler({ payload: payload as { type: 'drop'; paths: string[] } }))),
});
