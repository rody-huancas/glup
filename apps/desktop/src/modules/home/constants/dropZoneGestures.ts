import type { MascotGesture } from '@/modules/mascot/types/mascotGesture';

const DROP_ZONE_GESTURE_LIST: MascotGesture[] = ['wave', 'point'];

// While the drop zone waits for files, Glup waves or points at "Elegir archivos" every few seconds.
export const DROP_ZONE_GESTURES = {
  minDelay : 5000,
  maxDelay : 8000,
  gestures : DROP_ZONE_GESTURE_LIST,
};
