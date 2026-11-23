import { HistoryList } from '@/modules/history/components/HistoryList';
import { HistorySelectAll } from '@/modules/history/components/HistorySelectAll';
import { HISTORY_TEXTS } from '@/modules/history/constants/history';
import { useClearHistory } from '@/modules/history/hooks/useClearHistory';
import { useExpandedEntry } from '@/modules/history/hooks/useExpandedEntry';
import { useHistory } from '@/modules/history/hooks/useHistory';
import { useHistorySelection } from '@/modules/history/hooks/useHistorySelection';
import { useOpenEntry } from '@/modules/history/hooks/useOpenEntry';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { PageHeader } from '@/shared/components/PageHeader';

// With nothing marked the button empties the whole list; with lines marked it removes only those.
export const HistoryPage = () => {
  const { entries, now }    = useHistory();
  const { open, missingId } = useOpenEntry();
  const selection           = useHistorySelection(entries);
  const expanded            = useExpandedEntry({ entries, reveal: true });
  const clearing            = useClearHistory({ selected: selection.selected, onRemoved: selection.clear });
  const count               = selection.selected.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <PageHeader title={HISTORY_TEXTS.title} subtitle={HISTORY_TEXTS.subtitle} />
        <Button variant="secondary" disabled={entries.length === 0} onClick={clearing.ask} className="h-9 shrink-0 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-raised">
          {count > 0 ? HISTORY_TEXTS.removeSome(count) : HISTORY_TEXTS.clear}
        </Button>
      </div>
      {clearing.failed && <p role="alert" className="text-[13px] text-lilac-soft">{HISTORY_TEXTS.clearFailed}</p>}
      <div className="flex flex-col gap-3">
        {entries.length > 0 && <HistorySelectAll state={selection.state} onToggle={selection.toggleAll} />}
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
      {clearing.confirming && (
        <ConfirmDialog
          title={count > 0 ? HISTORY_TEXTS.removeTitle(count) : HISTORY_TEXTS.clearTitle}
          body={count > 0 ? HISTORY_TEXTS.removeBody(count) : HISTORY_TEXTS.clearBody}
          cancel={HISTORY_TEXTS.clearCancel}
          confirm={count > 0 ? HISTORY_TEXTS.removeOk : HISTORY_TEXTS.clearConfirm}
          onCancel={clearing.cancel}
          onConfirm={clearing.confirm}
        />
      )}
    </div>
  );
};
