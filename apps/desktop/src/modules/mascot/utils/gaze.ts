import { FIXED_GAZE, GAZE } from '@/modules/mascot/constants/animation';
import type { MascotState } from '@/modules/mascot/types/mascotState';
import type { Point } from '@/shared/interfaces/point';

interface ScreenCenterParams {
  element        : Element;
  windowPosition : Point;
}

interface CursorGazeParams {
  cursor : Point | null;
  anchor : Point;
}

const CENTER: Point = { x: 0, y: 0 };

export const getScreenCenter = ({ element, windowPosition }: ScreenCenterParams): Point => {
  const rect  = element.getBoundingClientRect();
  const ratio = window.devicePixelRatio;

  return {
    x: windowPosition.x + (rect.left + rect.width / 2) * ratio,
    y: windowPosition.y + (rect.top + rect.height / 2) * ratio,
  };
};

export const getCursorGaze = ({ cursor, anchor }: CursorGazeParams): Point => {
  if (!cursor) return CENTER;

  const dx       = cursor.x - anchor.x;
  const dy       = cursor.y - anchor.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) return CENTER;

  const strength = Math.min(distance / GAZE.range, 1) / distance;

  return { x: dx * strength, y: dy * strength };
};

export const getFixedGaze = (state: MascotState): Point | null => {
  if (state.type === 'working')  return FIXED_GAZE.working;
  if (state.type === 'confused') return FIXED_GAZE.confused;
  return null;
};
