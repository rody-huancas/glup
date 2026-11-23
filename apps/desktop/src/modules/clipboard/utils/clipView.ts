import { CLIPBOARD_TEXTS } from '@/modules/clipboard/constants/texts';
import type { Clip } from '@/modules/clipboard/interfaces/clip';
import { formatRelativeDate } from '@/modules/history/utils/relativeDate';

// What a screen reader calls a line: the start of its text, or "la imagen".
export const clipName = (clip: Clip): string => {
  if (clip.kind === 'image') return CLIPBOARD_TEXTS.imageName;

  const line = clip.preview.replace(/\s+/g, ' ').trim();
  return line.length > 40 ? `${line.slice(0, 40).trimEnd()}…` : line;
};

// "Google Chrome · hace 2 min"; an image also says its size.
export const clipMeta = (clip: Clip, now: Date): string => {
  const parts = [clip.kind === 'image' ? CLIPBOARD_TEXTS.image(clip.width, clip.height) : null, clip.source, formatRelativeDate(clip.date, now)];
  return parts.filter(Boolean).join(' · ');
};

// "15:30", for "En pausa hasta las 15:30".
export const pauseTime = (iso: string): string => {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};
