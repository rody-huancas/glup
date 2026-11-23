import { RESULT_TEXTS } from '@/modules/actions/constants/texts';
import type { ActionReport, FileOutcome } from '@/modules/actions/interfaces/actionReport';
import type { ActionResult } from '@/modules/actions/interfaces/actionResult';
import type { ActionId } from '@/modules/actions/types/actionId';
import { formatFileSize } from '@/modules/actions/utils/fileSize';
import { getExtension, getFileName } from '@/modules/actions/utils/paths';

interface Groups {
  saved     : FileOutcome[];
  failed    : FileOutcome[];
  unchanged : FileOutcome[];
}

const group = (outcomes: FileOutcome[]): Groups => ({
  saved     : outcomes.filter((item) => !item.error && !item.unchanged),
  failed    : outcomes.filter((item) => item.error !== null),
  unchanged : outcomes.filter((item) => item.unchanged !== null),
});

// "5 imágenes" or "3 PDFs", from the sources.
const countItems = (saved: FileOutcome[]): string =>
  saved.every((item) => getExtension(item.source) === 'pdf') ? RESULT_TEXTS.pdfs(saved.length) : RESULT_TEXTS.images(saved.length);

const sizeChange = (saved: FileOutcome[]): string => {
  const before = saved.reduce((total, item) => total + item.sizeBefore, 0);
  const after  = saved.reduce((total, item) => total + (item.sizeAfter ?? 0), 0);

  return RESULT_TEXTS.sizeChange(formatFileSize(before), formatFileSize(after));
};

// Actions where the weight says nothing: the name of the new PDF (or how many) is shown instead.
const NAMED_ACTIONS: ActionId[] = ['protect', 'unlock', 'watermark', 'page-numbers'];

// "Listo · de 2,4 MB a 680 KB", "Listo · 5 imágenes · de 12 MB a 3,1 MB" or "Listo · foto.pdf".
const doneMessage = (report: ActionReport, saved: FileOutcome[]): string => {
  if (report.output) return `${RESULT_TEXTS.done} · ${getFileName(report.output)}`;

  if (NAMED_ACTIONS.includes(report.actionId)) {
    const first = saved[0]?.output;
    return saved.length === 1 && first ? `${RESULT_TEXTS.done} · ${getFileName(first)}` : `${RESULT_TEXTS.done} · ${RESULT_TEXTS.pdfs(saved.length)}`;
  }

  // The size says nothing here: the name of the cut-out, or how many.
  if (report.actionId === 'remove-background') {
    const first = saved[0]?.output;
    return saved.length === 1 && first ? `${RESULT_TEXTS.done} · ${getFileName(first)}` : `${RESULT_TEXTS.done} · ${RESULT_TEXTS.withoutBg(saved.length)}`;
  }

  if (saved.length === 1) return `${RESULT_TEXTS.done} · ${sizeChange(saved)}`;

  return `${RESULT_TEXTS.done} · ${RESULT_TEXTS.images(saved.length)} · ${sizeChange(saved)}`;
};

const calmMessage = (report: ActionReport, unchanged: FileOutcome[]): string => {
  const several = unchanged.length > 1;

  if (!several && unchanged[0]?.unchanged) return unchanged[0].unchanged;

  if (report.actionId === 'compress') return several ? RESULT_TEXTS.alreadySmallN : RESULT_TEXTS.alreadySmall;
  return several ? RESULT_TEXTS.sameFormatN : RESULT_TEXTS.sameFormat;
};

const failureMessage = (outcomes: FileOutcome[], failed: FileOutcome[]): string => {
  if (outcomes.length === 1) return `${RESULT_TEXTS.failedSingle} · ${failed[0].error ?? ''}`;
  if (failed.length === outcomes.length) return RESULT_TEXTS.failedAll;

  return RESULT_TEXTS.partial(outcomes.length - failed.length, outcomes.length, failed.length);
};

// Turns the Rust report into what the panel shows: message, tone for Glup and the buttons to offer.
export const summarizeReport = (report: ActionReport): ActionResult => {
  const { saved, failed, unchanged } = group(report.outcomes);
  const firstOutput                  = report.output ?? saved[0]?.output ?? null;
  const single                       = report.output !== null || saved.length === 1;

  // A folder of pages or images has no single file to open: only "Ver en carpeta", which opens it.
  const base = {
    failedNames : failed.map((item) => getFileName(item.source)),
    openPath    : single && !report.outputIsFolder ? firstOutput : null,
    revealPath  : firstOutput,
    revealOpens : report.outputIsFolder,
    note        : null,
  };

  // "3 de 5 listas · cancelado": what finished before the cancel is kept.
  if (report.cancelled && report.pagesTotal !== null) {
    return { ...base, tone: 'calm', message: RESULT_TEXTS.cancelledPages(report.pagesDone ?? 0, report.pagesTotal) };
  }

  if (report.cancelled) {
    const done = report.outcomes.length - failed.length;
    return { ...base, tone: 'calm', message: RESULT_TEXTS.cancelled(done, report.total) };
  }

  if (failed.length > 0) {
    return { ...base, tone: saved.length > 0 || report.output ? 'partial' : 'failed', message: failureMessage(report.outcomes, failed) };
  }

  // "Listo · 5 imágenes en un ZIP · 3,1 MB": Abrir and Ver en carpeta point to the zip.
  if (report.bundled && report.output) {
    return {
      ...base,
      tone       : 'success',
      message    : RESULT_TEXTS.bundled(countItems(saved), formatFileSize(report.outputSize ?? 0)),
      note       : unchanged.length > 0 ? RESULT_TEXTS.skipped(unchanged.length) : null,
      openPath   : report.output,
      revealPath : report.output,
    };
  }

  if (saved.length === 0 && !report.output) {
    return { ...base, tone: 'calm', message: calmMessage(report, unchanged) };
  }

  const fileNote = saved.length === 1 ? saved[0].note ?? null : null;

  return {
    ...base,
    tone    : 'success',
    message : doneMessage(report, saved),
    note    : fileNote ?? (unchanged.length > 0 ? RESULT_TEXTS.skipped(unchanged.length) : null),
    // note    : unchanged.length > 0 ? RESULT_TEXTS.skipped(unchanged.length) : null,
  };
};

// Used when the command itself fails (not a single file).
export const failedResult = (message: string): ActionResult => ({
  tone        : 'failed',
  message     : `${RESULT_TEXTS.failedSingle} · ${message}`,
  note        : null,
  failedNames : [],
  openPath    : null,
  revealPath  : null,
  revealOpens : false,
});
