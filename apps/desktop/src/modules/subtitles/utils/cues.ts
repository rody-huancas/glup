import type { Cue } from '@/modules/subtitles/interfaces/cue';
import { MIN_CUE_MS } from '@/modules/subtitles/constants/texts';

// The phrase on screen at that moment (milliseconds), if any.
export const cueAt = (cues: Cue[], ms: number): number => cues.findIndex((cue) => ms >= cue.start && ms < cue.end);

// That phrase and the next one as one, from the start of the first to the end of the second.
export const mergeCues = (cues: Cue[], index: number): Cue[] => {
  const [first, second] = [cues[index], cues[index + 1]];
  if (!first || !second) return cues;
  const joined = { start: first.start, end: second.end, text: `${first.text.replace(/\n/g, ' ')} ${second.text.replace(/\n/g, ' ')}`.replace(/\s+/g, ' ').trim() };
  return [...cues.slice(0, index), joined, ...cues.slice(index + 2)];
};

// Where to cut a text: at `at` (the cursor) moved to the nearest space, or at the space nearest its middle.
export const splitPoint = (text: string, at?: number): number | null => {
  const spaces = [...text.matchAll(/\s/g)].map((match) => match.index ?? 0).filter((index) => index > 0 && index < text.length - 1);
  if (spaces.length === 0) return null;
  const aim = at !== undefined && at > 0 && at < text.length ? at : text.length / 2;
  return spaces.reduce((best, index) => (Math.abs(index - aim) < Math.abs(best - aim) ? index : best), spaces[0]);
};

// One phrase in two at that point, the time shared by the length of each part.
export const splitCue = (cues: Cue[], index: number, at?: number): Cue[] => {
  const cue   = cues[index];
  const point = cue ? splitPoint(cue.text, at) : null;
  if (!cue || point === null) return cues;
  const left  = cue.text.slice(0, point).trim();
  const right = cue.text.slice(point).trim();
  const cut   = Math.round(cue.start + ((cue.end - cue.start) * left.length) / (left.length + right.length));
  return [...cues.slice(0, index), { start: cue.start, end: cut, text: left }, { start: cut, end: cue.end, text: right }, ...cues.slice(index + 1)];
};

interface RetimeParams {
  cues     : Cue[];
  index    : number;
  which    : 'start' | 'end';
  ms       : number;
  duration : number;
}

// A start or an end moved: inside the video, never over its neighbours, and never shorter than a tenth.
export const retimeCue = ({ cues, index, which, ms, duration }: RetimeParams): Cue[] => {
  const cue = cues[index];
  if (!cue) return cues;
  const previous = cues[index - 1]?.end ?? 0;
  const next     = cues[index + 1]?.start ?? duration;
  const value    = which === 'start'
    ? Math.min(Math.max(previous, ms), cue.end - MIN_CUE_MS)
    : Math.max(Math.min(next, ms), cue.start + MIN_CUE_MS);
  return cues.map((each, position) => (position === index ? { ...each, [which]: Math.round(value) } : each));
};

export const editCue = (cues: Cue[], index: number, text: string): Cue[] => cues.map((cue, position) => (position === index ? { ...cue, text } : cue));

export const removeCue = (cues: Cue[], index: number): Cue[] => cues.filter((_, position) => position !== index);
