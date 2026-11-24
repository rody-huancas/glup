import { StartupRow } from '@/modules/performance/components/StartupRow';
import { PERFORMANCE_TEXTS } from '@/modules/performance/constants/texts';
import type { StartupEntry } from '@/modules/performance/interfaces/startupEntry';
import { SectionLabel } from '@/shared/components/SectionLabel';
import { Skeleton } from '@/shared/components/Skeleton';

interface StartupListProps {
  entries  : StartupEntry[] | null;
  busy     : string | null;
  error    : string | null;
  onToggle : (entry: StartupEntry, enabled: boolean) => void;
}

export const StartupList = ({ entries, busy, error, onToggle }: StartupListProps) => (
  <section className="flex flex-col gap-2">
    <div className="flex flex-col">
      <SectionLabel>{PERFORMANCE_TEXTS.startTitle}</SectionLabel>
      <p className="text-[11px] text-muted">{PERFORMANCE_TEXTS.startHint}</p>
    </div>
    {error && <p role="alert" className="text-[12px] text-lilac-soft">{error}</p>}
    {entries === null && <Skeleton className="h-24 w-full rounded-[14px]" />}
    {entries?.length === 0 && <p className="text-[12px] text-muted">{PERFORMANCE_TEXTS.startEmpty}</p>}
    {entries && entries.length > 0 && (
      <ul className="flex flex-col gap-1.5">
        {entries.map((entry) => (
          <StartupRow key={entry.id} entry={entry} busy={busy === entry.id} onToggle={onToggle} />
        ))}
      </ul>
    )}
  </section>
);
