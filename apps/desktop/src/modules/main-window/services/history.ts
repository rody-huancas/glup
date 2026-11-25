import { changeSettings } from '@/modules/settings/services/settings';

// The Historial was opened now: the side bar's count starts again from here.
export const markHistorySeen = (at: number = Date.now()): Promise<void> =>
  changeSettings((view) => ({ ...view, historySeenAt: at })).then(() => undefined);
