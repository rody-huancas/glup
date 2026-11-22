import type { CleanReport } from '@/modules/cleanup/interfaces/cleanReport';
import { Card } from '@/shared/components/Card';
import { cx } from '@/shared/utils/classNames';

interface CleanupResultProps {
  report: CleanReport;
}

// "Liberaste 3,1 GB", and plainly what stayed (files in use, changed, in the recycle bin).
export const CleanupResult = ({ report }: CleanupResultProps) => (
  <Card className="px-5 py-4">
    <p className={cx('text-lg font-bold', report.summary.tone === 'failed' ? 'text-warn' : 'text-mint')}>{report.summary.message}</p>
    {report.summary.note && <p className="mt-1 text-[13px] text-muted">{report.summary.note}</p>}
  </Card>
);
