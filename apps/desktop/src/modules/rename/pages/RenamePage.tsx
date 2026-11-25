import { useId } from 'react';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { OptionGroup } from '@/modules/pdf/components/OptionGroup';
import { RenameTable } from '@/modules/rename/components/RenameTable';
import { RuleCard } from '@/modules/rename/components/RuleCard';
import { RENAME_TEXTS, RULE_KINDS } from '@/modules/rename/constants/texts';
import { useRenamer } from '@/modules/rename/hooks/useRenamer';
import { useRenameUndo } from '@/modules/rename/hooks/useRenameUndo';
import type { RenameOrder, RenameRuleKind } from '@/modules/rename/interfaces/renameRule';
import { pickRenameFiles, pickRenameFolder } from '@/modules/rename/services/rename';
import { Button } from '@/shared/components/Button';
import { PageHeader } from '@/shared/components/PageHeader';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { Switch } from '@/shared/components/Switch';

const ORDERS: RenameOrder[] = ['name', 'date', 'given'];

// "Renombrar en lote": the files, the rules in order and how to number them on the left; the preview
// (problems in red) on the right, «Aplicar» under it, and «Deshacer» once applied.
export const RenamePage = (_props: PageProps) => {
  const renamer = useRenamer();
  const undo    = useRenameUndo();
  const addId   = useId();
  const pick    = (next: Promise<string[]>) => {
    void next.then((paths) => paths.length > 0 && renamer.setPaths(paths));
  };

  return (
    <div className="@container flex flex-col gap-4">
      <PageHeader title={RENAME_TEXTS.title} subtitle={RENAME_TEXTS.subtitle} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="pc" onClick={() => pick(pickRenameFiles())} className="h-10">{RENAME_TEXTS.choose}</Button>
        <Button variant="secondary" onClick={() => pick(pickRenameFolder())} className="h-10">{RENAME_TEXTS.folder}</Button>
        {renamer.paths.length > 0 && <span className="text-[12px] text-muted">{RENAME_TEXTS.files(renamer.paths.length)}</span>}
      </div>
      {renamer.paths.length === 0 ? (
        <p className="text-[13px] text-muted">{RENAME_TEXTS.empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-[minmax(300px,1fr)_minmax(0,1.3fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <SectionLabel>{RENAME_TEXTS.rules}</SectionLabel>
            <ol className="flex flex-col gap-2">
              {renamer.rules.map((rule, index) => (
                <RuleCard
                  key={`${index}-${rule.kind}`}
                  rule={rule}
                  index={index}
                  last={index === renamer.rules.length - 1}
                  onChange={(next) => renamer.changeRule(index, next)}
                  onMove={(to) => renamer.moveRule(index, to)}
                  onRemove={() => renamer.removeRule(index)}
                />
              ))}
            </ol>
            <label htmlFor={addId} className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
              {RENAME_TEXTS.addRule}
              <select id={addId} value="" onChange={(event) => event.target.value && renamer.addRule(event.target.value as RenameRuleKind)} className="h-9 rounded-control border border-line-strong bg-raised px-2 text-[13px] text-text outline-none focus:border-fam-pc">
                <option value="">…</option>
                {RULE_KINDS.map((kind) => <option key={kind} value={kind}>{RENAME_TEXTS.kinds[kind]}</option>)}
              </select>
            </label>
            <OptionGroup label={RENAME_TEXTS.order} options={ORDERS} labels={RENAME_TEXTS.orders} value={renamer.order} onChange={renamer.setOrder} />
            {renamer.order === 'given' && <p className="text-[11px] text-muted">{RENAME_TEXTS.dragHint}</p>}
            <Switch accent="pc" label={RENAME_TEXTS.lowerExt} checked={renamer.lowerExt} onChange={renamer.setLowerExt} />
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <SectionLabel>{RENAME_TEXTS.preview}</SectionLabel>
              <span aria-live="polite" className="text-[12px] text-muted">{RENAME_TEXTS.summary(renamer.changing, renamer.problems)}</span>
            </div>
            <RenameTable rows={renamer.rows} onMove={renamer.moveFile} />
            {renamer.problems > 0 && <p role="alert" className="text-[12px] text-danger">{RENAME_TEXTS.blocked}</p>}
            {renamer.problem && <p role="alert" className="text-[12px] text-danger">{renamer.problem}</p>}
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
              {renamer.report && (
                <p role="status" className="flex flex-1 items-center gap-2 text-[12px] text-text">
                  {undo.message ?? renamer.report.message}
                  {renamer.report.undo && !undo.message && (
                    <Button variant="secondary" onClick={() => renamer.report?.undo && undo.undo(renamer.report.undo)} disabled={undo.running} className="h-8 px-3 text-[12px]">
                      {undo.running ? RENAME_TEXTS.undoing : RENAME_TEXTS.undo}
                    </Button>
                  )}
                </p>
              )}
              <span className="flex-1" />
              <Button variant="pc" onClick={renamer.apply} disabled={!renamer.canApply} className="h-10 disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted">
                {renamer.applying ? RENAME_TEXTS.applying : RENAME_TEXTS.apply}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
