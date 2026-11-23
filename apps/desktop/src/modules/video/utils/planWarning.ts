import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { VIDEO_TEXTS } from '@/modules/video/constants/texts';
import type { VideoPlanReport } from '@/modules/video/interfaces/videoPlanReport';
import type { VideoGoal } from '@/modules/video/types/videoGoal';

// What to say before starting when a video cannot get under the size asked for, or null.
// One video: how much it will weigh anyway. Several: how many of them go over.
export const planWarning = (reports: VideoPlanReport[], goal: VideoGoal): string | null => {
  const long = reports.filter((report) => report.plan?.tooLong);
  if (long.length === 0) return null;
  if (long.length > 1 || reports.length > 1) return VIDEO_TEXTS.severalLong(long.length);

  const plan = long[0].plan;
  if (!plan) return null;

  const size = formatFileSize(plan.estimate);
  return goal === 'email' || !plan.budget ? VIDEO_TEXTS.tooLong(size) : VIDEO_TEXTS.tooLongFor(formatFileSize(plan.budget), size);
};

// "Quedará en unos 14 MB" for one video (several have no single number to show).
export const planEstimate = (reports: VideoPlanReport[]): string | null => {
  const plan = reports.length === 1 ? reports[0].plan : null;
  return plan && !plan.tooLong ? VIDEO_TEXTS.estimate(formatFileSize(plan.estimate)) : null;
};
