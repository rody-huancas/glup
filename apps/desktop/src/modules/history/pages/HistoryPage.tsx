import { HistoryList } from '@/modules/history/components/HistoryList';
import { HISTORY_TEXTS } from '@/modules/history/constants/history';
import { useHistory } from '@/modules/history/hooks/useHistory';
import { PageHeader } from '@/shared/components/PageHeader';

export const HistoryPage = () => {
  const { entries, now } = useHistory();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={HISTORY_TEXTS.title} subtitle={HISTORY_TEXTS.subtitle} />
      <HistoryList entries={entries} now={now} />
    </div>
  );
};
