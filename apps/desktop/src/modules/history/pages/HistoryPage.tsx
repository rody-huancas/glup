import { HistoryList } from '@/modules/history/components/HistoryList';
import { HISTORY_TEXTS } from '@/modules/history/constants/history';
import { useHistory } from '@/modules/history/hooks/useHistory';
import { useOpenEntry } from '@/modules/history/hooks/useOpenEntry';
import { PageHeader } from '@/shared/components/PageHeader';

export const HistoryPage = () => {
  const { entries, now }    = useHistory();
  const { open, missingId } = useOpenEntry();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={HISTORY_TEXTS.title} subtitle={HISTORY_TEXTS.subtitle} />
      <HistoryList entries={entries} now={now} missingId={missingId} onOpen={open} />
    </div>
  );
};
