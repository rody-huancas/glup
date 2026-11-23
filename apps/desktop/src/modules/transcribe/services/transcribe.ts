import { invoke } from '@tauri-apps/api/core';
import type { ModelStatus } from '@/modules/background/interfaces/modelStatus';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';
import type { TranscribeOptions } from '@/modules/transcribe/interfaces/transcribeOptions';
import type { TranscribeReport } from '@/modules/transcribe/interfaces/transcribeReport';
import type { TranscribeLevel } from '@/modules/transcribe/types/transcribeLevel';
import {
  DELETE_TRANSCRIBE_MODEL,
  DOWNLOAD_TRANSCRIBE_MODEL,
  ESTIMATE_TRANSCRIPTION,
  GET_TRANSCRIBE_MODEL,
  SAVE_SUBTITLES,
  TRANSCRIBE_AUDIO,
} from '@/shared/constants/events';

interface TranscribeParams {
  paths   : string[];
  options : TranscribeOptions;
  taskId  : string;
}

interface SaveSubtitlesParams {
  paths       : string[];
  subtitles   : string;
  destination : SaveDestination;
}

// Whether that level is learned (FFmpeg included) and what its download weighs.
export const getTranscribeModel = (level: TranscribeLevel): Promise<ModelStatus> => invoke<ModelStatus>(GET_TRANSCRIBE_MODEL, { level });

export const downloadTranscribeModel = (level: TranscribeLevel, taskId: string): Promise<TaskSummary> =>
  invoke<TaskSummary>(DOWNLOAD_TRANSCRIBE_MODEL, { request: { level, taskId } });

export const deleteTranscribeModel = (level: TranscribeLevel): Promise<void> => invoke<void>(DELETE_TRANSCRIBE_MODEL, { level });

export const transcribeAudio = ({ paths, options, taskId }: TranscribeParams): Promise<TranscribeReport> =>
  invoke<TranscribeReport>(TRANSCRIBE_AUDIO, { request: { paths, options, taskId } });

// Seconds it will take, from the length of the audio (the rule lives in Rust).
export const estimateTranscription = (level: TranscribeLevel, seconds: number): Promise<number> =>
  invoke<number>(ESTIMATE_TRANSCRIPTION, { request: { level, seconds } });

export const saveSubtitles = ({ paths, subtitles, destination }: SaveSubtitlesParams): Promise<string> =>
  invoke<string>(SAVE_SUBTITLES, { request: { paths, subtitles, destination } });
