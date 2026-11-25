import { MIN_STRETCH } from '@/modules/media/constants/texts';

// "1:05.3" (and "1:02:05.3" with hours): minutes, seconds and tenths.
export const formatTime = (seconds: number): string => {
  const tenths  = Math.round(Math.max(0, seconds) * 10);
  const whole   = Math.floor(tenths / 10);
  const hours   = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs    = String(whole % 60).padStart(2, '0');
  const tenth   = tenths % 10;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}.${tenth}` : `${minutes}:${secs}.${tenth}`;
};

// What is typed back to seconds: "1:05.3", "65.3", "1:02:05"; null when it is not a time.
export const parseTime = (text: string): number | null => {
  const parts = text.trim().replace(',', '.').split(':');
  if (parts.length === 0 || parts.length > 3 || parts.some((part) => !/^\d+(\.\d+)?$/.test(part))) return null;
  return parts.reduce((total, part) => total * 60 + Number(part), 0);
};

export interface Stretch {
  start : number;
  end   : number;
}

interface MoveParams {
  stretch  : Stretch;
  which    : 'start' | 'end';
  to       : number;
  duration : number;
}

// One end of the stretch to a new place, inside the file and never past the other end.
export const moveEdge = ({ stretch, which, to, duration }: MoveParams): Stretch => {
  const value = Math.min(Math.max(0, to), duration);
  return which === 'start'
    ? { ...stretch, start: Math.min(value, Math.max(0, stretch.end - MIN_STRETCH)) }
    : { ...stretch, end: Math.max(value, Math.min(duration, stretch.start + MIN_STRETCH)) };
};

// Where a fast cut really starts: the last key frame at or before the start (0 without any).
export const keyframeBefore = (keyframes: number[], at: number): number => keyframes.filter((time) => time <= at + 0.001).reduce((best, time) => Math.max(best, time), 0);
