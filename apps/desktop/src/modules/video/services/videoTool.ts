import { invoke } from '@tauri-apps/api/core';
import type { ModelStatus } from '@/modules/background/interfaces/modelStatus';
import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';
import type { VideoOptions } from '@/modules/video/interfaces/videoOptions';
import type { VideoPlanReport } from '@/modules/video/interfaces/videoPlanReport';
import { DELETE_VIDEO_TOOL, DOWNLOAD_VIDEO_TOOL, GET_VIDEO_TOOL, PLAN_VIDEOS } from '@/shared/constants/events';

// Whether Glup already has what it needs for videos, and what the download weighs.
export const getVideoTool = (): Promise<ModelStatus> => invoke<ModelStatus>(GET_VIDEO_TOOL);

// Only after the person says yes; resumes a cut download and checks it.
export const downloadVideoTool = (taskId: string): Promise<TaskSummary> => invoke<TaskSummary>(DOWNLOAD_VIDEO_TOOL, { request: { taskId } });

export const deleteVideoTool = (): Promise<void> => invoke<void>(DELETE_VIDEO_TOOL);

interface PlanVideosParams {
  paths   : string[];
  options : VideoOptions;
}

export const planVideos = ({ paths, options }: PlanVideosParams): Promise<VideoPlanReport[]> =>
  invoke<VideoPlanReport[]>(PLAN_VIDEOS, { request: { paths, options } });
