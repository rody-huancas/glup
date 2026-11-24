import { useMemo } from 'react';
import { HistoryList } from '@/modules/history/components/HistoryList';
import { HISTORY_TEXTS } from '@/modules/history/constants/history';
import { useClearHistory } from '@/modules/history/hooks/useClearHistory';
import { useExpandedEntry } from '@/modules/history/hooks/useExpandedEntry';
import { useHistory } from '@/modules/history/hooks/useHistory';
import { useOpenEntry } from '@/modules/history/hooks/useOpenEntry';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { PageHeader } from '@/shared/components/PageHeader';
import { SelectAll } from '@/shared/components/SelectAll';
import { SelectionBar } from '@/shared/components/SelectionBar';
import { useCheckSelection } from '@/shared/hooks/useCheckSelection';

// "Limpiar historial" empties the whole list; the lines marked are removed from the bar next to
// "Seleccionar todo", right above them.
export const HistoryPage = () => {
  const { entries, now }    = useHistory();
  const { open, missingId } = useOpenEntry();
  const ids                 = useMemo(() => entries.map((entry) => entry.id), [entries]);
  const selection           = useCheckSelection(ids);
  const expanded            = useExpandedEntry({ entries, reveal: true });
  const clearing            = useClearHistory({ selected: selection.selected, onRemoved: selection.clear });
  const count               = selection.selected.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <PageHeader title={HISTORY_TEXTS.title} subtitle={HISTORY_TEXTS.subtitle} />
        <Button variant="secondary" disabled={entries.length === 0} onClick={() => clearing.ask('all')} className="h-9 shrink-0 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-raised">
          {HISTORY_TEXTS.clear}
        </Button>
      </div>
      {clearing.failed && <p role="alert" className="text-[13px] text-lilac-soft">{HISTORY_TEXTS.clearFailed}</p>}
      <div className="flex flex-col gap-3">
        {entries.length > 0 && (
          <div className="flex min-h-9 items-center justify-between gap-3">
            <SelectAll label={HISTORY_TEXTS.selectAll} state={selection.state} onToggle={selection.toggleAll} />
            <SelectionBar count={count} onRemove={() => clearing.ask('selected')} onCancel={selection.clear} />
          </div>
        )}
        <HistoryList
          entries={entries}
          now={now}
          missingId={missingId}
          expandedId={expanded.expandedId}
          selected={selection.selected}
          onSelect={selection.toggle}
          onOpen={open}
          onExpand={expanded.toggle}
        />
      </div>
      {clearing.asking && (
        <ConfirmDialog
          title={clearing.asking === 'selected' ? HISTORY_TEXTS.removeTitle(count) : HISTORY_TEXTS.clearTitle}
          body={clearing.asking === 'selected' ? HISTORY_TEXTS.removeBody(count) : HISTORY_TEXTS.clearBody}
          cancel={HISTORY_TEXTS.clearCancel}
          confirm={clearing.asking === 'selected' ? HISTORY_TEXTS.removeOk : HISTORY_TEXTS.clearConfirm}
          onCancel={clearing.cancel}
          onConfirm={clearing.confirm}
        />
      )}
    </div>
  );
};
