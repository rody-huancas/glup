import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import type { SaveDestination } from '@/modules/settings/interfaces/appSettings';
import { TEXT_TEXTS } from '@/modules/text/constants/texts';
import type { TextReport } from '@/modules/text/interfaces/textReport';

interface TextResultParams {
  report      : TextReport;
  paths       : string[];
  destination : SaveDestination;
  cancelled   : boolean;
}

// The task result: the text to read, copy or save; or Glup confused when there was none.
export const toTextResult = ({ report, paths, destination, cancelled }: TextResultParams): ActionResult => {
  const base = { note: null, failedNames: [], openPath: null, revealPath: null, revealOpens: false };

  if (report.text.trim().length === 0) {
    return { ...base, tone: cancelled ? 'calm' : 'failed', message: TEXT_TEXTS.empty };
  }

  return {
    ...base,
    tone    : 'success',
    message : TEXT_TEXTS.done(report.pages),
    text    : { text: report.text, paths, destination, entryId: report.entryId },
  };
};
