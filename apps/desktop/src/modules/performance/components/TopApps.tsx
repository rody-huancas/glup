import { TopAppRow } from '@/modules/performance/components/TopAppRow';
import { PERFORMANCE_TEXTS } from '@/modules/performance/constants/texts';
import type { AppUsage } from '@/modules/performance/interfaces/appUsage';
import { SectionLabel } from '@/shared/components/SectionLabel';

interface TopAppsProps {
  apps    : AppUsage[];
  onClose : (app: AppUsage) => void;
}

// Glup is protected and its own program is the one running this screen.
const GLUP_NAMES = ['glup.exe', 'glup'];

const isGlup = (app: AppUsage): boolean => GLUP_NAMES.some((name) => app.id.endsWith(`\\${name}`) || app.id === name);

export const TopApps = ({ apps, onClose }: TopAppsProps) => (
  <section className="flex flex-col gap-2">
    <div className="flex flex-col">
      <SectionLabel>{PERFORMANCE_TEXTS.topTitle}</SectionLabel>
      <p className="text-[11px] text-muted">{PERFORMANCE_TEXTS.topHint}</p>
    </div>
    <ul className="flex flex-col gap-1.5">
      {apps.map((app) => (
        <TopAppRow key={app.id} app={app} isGlup={isGlup(app)} onClose={onClose} />
      ))}
    </ul>
  </section>
);
