import { ACTIONS_TEXTS, STAGE_TEXTS, VIA_TEXTS, WORKING_TEXTS } from '@/modules/actions/constants/texts';
import type { ActionProgress } from '@/modules/actions/interfaces/actionReport';
import type { ActionId } from '@/modules/actions/types/actionId';

interface LabelParams {
  progress   : ActionProgress | null;
  actionId   : ActionId | null;
  cancelling : boolean;
}

// The counted part is over but the task is not: what is left is writing it down.
const countDone = (progress: ActionProgress): boolean => progress.total > 0 && progress.current >= progress.total;

// 0 to 1 only while something is counted (bytes, pages, files, percent) and not finished yet; null
// moves the bar on its own. So the bar never sits full while Glup is still checking or saving.
export const progressFraction = (progress: ActionProgress | null): number | null => {
  if (!progress) return null;
  if (progress.stage !== 'downloading' && progress.stage !== 'working') return null;
  if (progress.total <= 1 && !progress.detail) return null;
  if (progress.total <= 0 || countDone(progress)) return null;

  return Math.max(progress.current / progress.total, 0);
};

// "Descargando lo que necesito…", "Pasando a texto…", "Guardando…".
export const progressLabel = ({ progress, actionId, cancelling }: LabelParams): string => {
  if (cancelling) return ACTIONS_TEXTS.cancelling;

  const stage = progress?.stage ?? 'working';
  if (stage !== 'working') return STAGE_TEXTS[stage];
  if (progress && countDone(progress)) return STAGE_TEXTS.saving;

  const words = actionId ? WORKING_TEXTS[actionId] : ACTIONS_TEXTS.working;
  return progress?.via ? `${words} ${VIA_TEXTS[progress.via]}` : words;
};

// The line under the bar: "120 MB de 514 MB", "35 %", or nothing (the "N de M" row covers files).
export const progressDetail = (progress: ActionProgress | null): string | null =>
  progress && (progress.stage === 'downloading' || progress.stage === 'working') && !countDone(progress) ? progress.detail ?? null : null;
