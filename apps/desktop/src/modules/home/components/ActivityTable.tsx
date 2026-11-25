import { FAMILIES, FAMILY_IDS } from '@/modules/families/constants/families';
import { ACTIVITY_TEXTS } from '@/modules/home/constants/activity';
import type { ActivityBucket } from '@/modules/home/interfaces/activityBucket';

interface ActivityTableProps {
  buckets: ActivityBucket[];
}

// The chart's data for screen readers: a period per row, a family per column.
export const ActivityTable = ({ buckets }: ActivityTableProps) => (
  <table className="sr-only">
    <caption>{ACTIVITY_TEXTS.table}</caption>
    <thead>
      <tr>
        <th scope="col">{ACTIVITY_TEXTS.period}</th>
        {FAMILY_IDS.map((family) => <th key={family} scope="col">{FAMILIES[family].name}</th>)}
        <th scope="col">{ACTIVITY_TEXTS.total}</th>
      </tr>
    </thead>
    <tbody>
      {buckets.map((bucket) => (
        <tr key={bucket.start}>
          <th scope="row">{bucket.title}</th>
          {FAMILY_IDS.map((family) => <td key={family}>{bucket.counts[family]}</td>)}
          <td>{bucket.total}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
