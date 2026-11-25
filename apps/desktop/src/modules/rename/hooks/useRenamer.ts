import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PREVIEW_DELAY } from '@/modules/rename/constants/texts';
import type { ApplyReport, RenameOrder, RenameRow, RenameRule, RenameRuleKind } from '@/modules/rename/interfaces/renameRule';
import { applyRename, renamePreview } from '@/modules/rename/services/rename';
import { subscribeRenameInbox, takeRenameInbox } from '@/modules/rename/store/renameInbox';
import { moveItem, newRule } from '@/modules/rename/utils/rename';

// "Renombrar en lote": the files (and their order), the rules, the preview from Rust a moment after each
// change (with every problem), and applying it.
export const useRenamer = () => {
  const [paths, setPaths]       = useState<string[]>([]);
  const [rules, setRules]       = useState<RenameRule[]>([newRule('number')]);
  const [order, setOrder]       = useState<RenameOrder>('name');
  const [lowerExt, setLowerExt] = useState(false);
  const [rows, setRows]         = useState<RenameRow[]>([]);
  const [applying, setApplying] = useState(false);
  const [report, setReport]     = useState<ApplyReport | null>(null);
  const [problem, setProblem]   = useState<string | null>(null);
  const turn                    = useRef(0);

  const take = useCallback(() => {
    const inbox = takeRenameInbox();
    if (inbox) {
      setPaths(inbox);
      setReport(null);
    }
  }, []);
  useEffect(() => {
    take();
    return subscribeRenameInbox(take);
  }, [take]);

  const request = useMemo(() => ({ paths, rules, order, lowerExtension: lowerExt }), [paths, rules, order, lowerExt]);
  useEffect(() => {
    if (paths.length === 0) return setRows([]);
    const mine  = ++turn.current;
    const timer = window.setTimeout(() => {
      void renamePreview(request).then((next) => mine === turn.current && setRows(next)).catch((failure: unknown) => setProblem(String(failure)));
    }, PREVIEW_DELAY);
    return () => window.clearTimeout(timer);
  }, [request, paths.length]);

  const changeRule = (index: number, next: Partial<RenameRule>) => setRules((current) => current.map((rule, at) => (at === index ? ({ ...rule, ...next } as RenameRule) : rule)));
  const addRule    = (kind: RenameRuleKind) => setRules((current) => [...current, newRule(kind)]);
  const removeRule = (index: number) => setRules((current) => current.filter((_, at) => at !== index));
  const moveRule   = (from: number, to: number) => setRules((current) => moveItem(current, from, to));

  // In «Como los ordene», a row moved moves its file (the preview comes in the same order).
  const moveFile = (from: number, to: number) => {
    setOrder('given');
    setPaths(moveItem(rows.length === paths.length ? rows.map((row) => row.path) : paths, from, to));
  };

  const apply = () => {
    setApplying(true);
    setProblem(null);
    void applyRename(request)
      .then((done) => {
        setReport(done);
        // The files have their new names now: they stay on the screen under them.
        setPaths(rows.map((row) => row.path.replace(/[^\\/]+$/, row.new)));
        setRules([newRule('number')]);
      })
      .catch((failure: unknown) => setProblem(String(failure)))
      .finally(() => setApplying(false));
  };

  const problems = rows.filter((row) => row.problem).length;
  const changing = rows.filter((row) => row.changed).length;

  return {
    paths, setPaths: (next: string[]) => {
      setPaths(next);
      setReport(null);
    },
    rules, changeRule, addRule, removeRule, moveRule, order, setOrder, lowerExt, setLowerExt,
    rows, moveFile, problems, changing, apply, applying, report, problem, canApply: problems === 0 && changing > 0 && !applying,
  };
};
