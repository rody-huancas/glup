import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import type { FileInfo } from '@/modules/actions/interfaces/fileInfo';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { TRANSCRIBE_TEXTS } from '@/modules/transcribe/constants/transcribe';
import type { TranscribeOptions } from '@/modules/transcribe/interfaces/transcribeOptions';
import type { TranscribeReport } from '@/modules/transcribe/interfaces/transcribeReport';
import type { TranscribeLanguage } from '@/modules/transcribe/types/transcribeLanguage';
import type { TranscribeLevel } from '@/modules/transcribe/types/transcribeLevel';

interface ResultParams {
  report      : TranscribeReport;
  paths       : string[];
  destination : SaveDestination;
}

interface OptionsParams {
  level    : TranscribeLevel;
  language : TranscribeLanguage;
  // The one picked in the longer list when "Otro" is chosen.
  other    : TranscribeLanguage;
}

// The seconds of all the files, or null while some length is unknown.
export const totalSeconds = (files: FileInfo[]): number | null =>
  files.every((file) => file.duration !== null) ? files.reduce((sum, file) => sum + (file.duration ?? 0), 0) : null;

// "Esto tomará unos 2 minutos" (or less than a minute).
export const estimateText = (seconds: number): string =>
  seconds < 60 ? TRANSCRIBE_TEXTS.quick : TRANSCRIBE_TEXTS.estimate(Math.round(seconds / 60));

// "3 min 20 s", "45 s", "1 h 05 min" (the same words as the history line in Rust).
export const durationLabel = (seconds: number): string => {
  const total   = Math.round(seconds);
  const hours   = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const rest    = total % 60;

  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, '0')} min`;
  if (minutes === 0) return `${rest} s`;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
};

export const toOptions = ({ level, language, other }: OptionsParams): TranscribeOptions => {
  const chosen = language === 'other' ? other : language;
  return { level, language: chosen === 'auto' || chosen === 'other' ? null : chosen };
};

// The text to read, copy or save (with its subtitles); or Glup confused when nobody spoke.
export const toTranscribeResult = ({ report, paths, destination }: ResultParams): ActionResult => {
  const base = { note: null, failedNames: [], openPath: null, revealPath: null, revealOpens: false };

  if (report.text.trim().length === 0) {
    return { ...base, tone: report.cancelled ? 'calm' : 'failed', message: TRANSCRIBE_TEXTS.empty };
  }

  return {
    ...base,
    tone    : 'success',
    message : TRANSCRIBE_TEXTS.done(durationLabel(report.seconds)),
    text    : { text: report.text, paths, destination, entryId: report.entryId, subtitles: report.subtitles },
  };
};
