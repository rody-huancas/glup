import { invoke } from '@tauri-apps/api/core';
import type { ActionReport } from '@/modules/actions/interfaces/actionReport';
import type { AnimationOptions, AnimationPreview } from '@/modules/media/interfaces/animationOptions';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { PREVIEW_ANIMATION, SAVE_ANIMATION } from '@/shared/constants/events';

interface AnimationParams {
  path    : string;
  start   : number;
  end     : number;
  options : AnimationOptions;
}

interface SaveAnimationParams extends AnimationParams {
  destination : SaveDestination;
  taskId      : string;
}

// The real animation of the stretch, to see it and its weight on the screen.
export const previewAnimation = ({ path, start, end, options }: AnimationParams): Promise<AnimationPreview> =>
  invoke<AnimationPreview>(PREVIEW_ANIMATION, { request: { path, start, end, options, destination: null, taskId: null } });

// Saved as a task (the preview of the same choices is copied, nothing made twice).
export const saveAnimation = ({ path, start, end, options, destination, taskId }: SaveAnimationParams): Promise<ActionReport> =>
  invoke<ActionReport>(SAVE_ANIMATION, { request: { path, start, end, options, destination, taskId } });
