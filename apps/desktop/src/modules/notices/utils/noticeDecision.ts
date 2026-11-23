import { SHORT_TASK_MS } from '@/modules/notices/constants/notices';
import type { NoticeDecision } from '@/modules/notices/interfaces/noticeDecision';

interface DecideNoticeParams {
  // The panel is open (the island expanded).
  panelOpen  : boolean;
  // The person is using Glup right now: the cursor over the panel or Glup in front.
  attentive  : boolean;
  // From the moment the task started running.
  durationMs : number;
}

interface AfterSystemParams {
  decision  : NoticeDecision;
  // The Windows notification really showed (they can be turned off in Ajustes).
  shown     : boolean;
  panelOpen : boolean;
}

// How a finished task is told:
// - panel open and the person there (or a task so short they are surely still looking): the toast now;
// - otherwise a Windows notification, and no toast (it would say the same twice).
export const decideNotice = ({ panelOpen, attentive, durationMs }: DecideNoticeParams): NoticeDecision => {
  if (panelOpen && (attentive || durationMs < SHORT_TASK_MS)) return { toast: 'now', system: false };
  return { toast: 'none', system: true };
};

// If the Windows notification did not show, the toast takes its place: now, or when the panel opens.
export const afterSystem = ({ decision, shown, panelOpen }: AfterSystemParams): NoticeDecision => {
  if (!decision.system || shown) return decision;
  return { toast: panelOpen ? 'now' : 'on-open', system: false };
};
