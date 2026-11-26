import { FAMILY_IDS } from '@/modules/families/constants/families';
import type { ActivityBucket } from '@/modules/home/interfaces/activityBucket';
import { bucketSummary } from '@/modules/home/utils/activity';

interface WeekCapsulesProps {
  days : ActivityBucket[];
}

// Seven small capsules, one per day, stacked by the colour of each family; a day with nothing is a low,
// dim capsule (never an empty slot). The days are said in the same dim grey; today, in white and bold.
// The words are for screen readers (the card says the rest).
export const WeekCapsules = ({ days }: WeekCapsulesProps) => {
  const max = Math.max(1, ...days.map((day) => day.total));

  return (
    <div className="flex h-14 items-end justify-between gap-1.5" role="img" aria-label={days.map(bucketSummary).join('. ')}>
      {days.map((day, index) => (
        <div key={day.start} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          {day.total === 0 ? (
            <span aria-hidden className="h-2 w-full max-w-3.5 rounded-full bg-line-strong/60" />
          ) : (
            <span aria-hidden className="flex w-full max-w-3.5 flex-col-reverse gap-px overflow-hidden rounded-full" style={{ height: `${Math.max(14, (day.total / max) * 100)}%` }}>
              {FAMILY_IDS.filter((family) => day.counts[family] > 0).map((family) => (
                <span key={family} className="w-full" style={{ flexGrow: day.counts[family], backgroundColor: `var(--color-fam-${family})` }} />
              ))}
            </span>
          )}
          <span aria-hidden className={index === days.length - 1 ? 'text-[10px] leading-none font-bold text-text' : 'text-[10px] leading-none text-muted/70'}>{day.label}</span>
        </div>
      ))}
    </div>
  );
};
