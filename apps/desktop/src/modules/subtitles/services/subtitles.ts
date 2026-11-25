import { invoke } from '@tauri-apps/api/core';
import type { ActionReport } from '@/modules/actions/interfaces/actionReport';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import type { Cue } from '@/modules/subtitles/interfaces/cue';
import type { SubtitleMode } from '@/modules/subtitles/types/subtitleMode';
import type { TranscribeOptions } from '@/modules/transcribe/interfaces/transcribeOptions';
import { LISTEN_SUBTITLES, SAVE_VIDEO_SUBTITLES } from '@/shared/constants/events';

interface ListenParams {
  path    : string;
  options : TranscribeOptions;
  taskId  : string;
}

export interface SubtitlesDraft {
  cues      : Cue[];
  cancelled : boolean;
}

// The video heard (as "Pasar audio a texto" does) and made into short phrases.
export const listenSubtitles = ({ path, options, taskId }: ListenParams): Promise<SubtitlesDraft> =>
  invoke<SubtitlesDraft>(LISTEN_SUBTITLES, { request: { path, options, taskId } });

interface SaveParams {
  path        : string;
  cues        : Cue[];
  mode        : SubtitleMode;
  background  : boolean;
  language    : string | null;
  destination : SaveDestination;
  taskId      : string;
}

export const saveVideoSubtitles = ({ path, cues, mode, background, language, destination, taskId }: SaveParams): Promise<ActionReport> =>
  invoke<ActionReport>(SAVE_VIDEO_SUBTITLES, { request: { path, cues, mode, background, language, destination, taskId } });
