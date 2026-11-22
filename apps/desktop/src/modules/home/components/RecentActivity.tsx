import { HistoryList } from '@/modules/history/components/HistoryList';
import { HISTORY_TEXTS, RECENT_LIMIT } from '@/modules/history/constants/history';
import { useHistory } from '@/modules/history/hooks/useHistory';
import { SectionLabel } from '@/shared/components/SectionLabel';

interface RecentActivityProps {
  onSeeAll: () => void;
}

export const RecentActivity = ({ onSeeAll }: RecentActivityProps) => {
  const { entries, now } = useHistory(RECENT_LIMIT);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <SectionLabel>{HISTORY_TEXTS.recent}</SectionLabel>
        <button type="button" onClick={onSeeAll} className="cursor-pointer text-[13px] font-semibold text-lilac hover:text-lilac-soft">
          {HISTORY_TEXTS.seeAll}
        </button>
      </div>
      <HistoryList entries={entries} now={now} />
    </section>
  );
};
