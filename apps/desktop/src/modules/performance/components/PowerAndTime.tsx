import { PERFORMANCE_TEXTS } from '@/modules/performance/constants/texts';
import type { Overview } from '@/modules/performance/interfaces/overview';
import { batteryHealthPhrase, batteryStatePhrase, shouldRestart, uptimeText } from '@/modules/performance/utils/phrases';

interface PowerAndTimeProps {
  overview: Overview;
}

// The battery (only on a PC that has one) and the time since the last restart.
export const PowerAndTime = ({ overview }: PowerAndTimeProps) => {
  const battery = overview.battery;
  const restart = shouldRestart(overview.uptime);

  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-raised p-3 text-[12px]">
      {battery && (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-muted">{PERFORMANCE_TEXTS.batteryTitle}</span>
            <span className="font-semibold tabular-nums text-text">{battery.percent} % · {batteryStatePhrase(battery)}</span>
          </div>
          <p className="text-muted">{batteryHealthPhrase(battery)}</p>
        </div>
      )}
      <p className="text-text">{PERFORMANCE_TEXTS.uptime(uptimeText(overview.uptime))}</p>
      {restart && <p className="text-warn">{PERFORMANCE_TEXTS.restart}</p>}
    </div>
  );
};
