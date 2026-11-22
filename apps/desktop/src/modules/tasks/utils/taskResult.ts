import type { ActionReport } from '@/modules/actions/interfaces/actionReport';
import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import { summarizeReport } from '@/modules/actions/utils/result';
import type { TaskSummary } from '@/modules/tasks/interfaces/taskSummary';

export const summaryToResult = (summary: TaskSummary): ActionResult => ({
  tone        : summary.tone,
  message     : summary.message,
  note        : summary.note,
  failedNames : [],
  openPath    : null,
  revealPath  : null,
  revealOpens : false,
});

const isResult = (value: ActionReport | ActionResult): value is ActionResult => 'tone' in value;

// Actions return a file report; tasks like Limpieza return their result ready to show.
export const toTaskResult = (value: ActionReport | ActionResult): ActionResult => (isResult(value) ? value : summarizeReport(value));
