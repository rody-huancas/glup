import { LearnedSection } from '@/modules/background/components/LearnedSection';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { AutostartToggle } from '@/modules/settings/components/AutostartToggle';
import { NotificationsToggle } from '@/modules/settings/components/NotificationsToggle';
import { SaveLocationPicker } from '@/modules/settings/components/SaveLocationPicker';
import { GENERAL_TEXTS } from '@/modules/settings/constants/general';
import { SAVE_TEXTS, SETTINGS_TEXTS } from '@/modules/settings/constants/saveLocation';
import { Card } from '@/shared/components/Card';
import { UpdateCard } from '@/modules/updates/components/UpdateCard';
import { VersionRow } from '@/modules/updates/components/VersionRow';
import { PageHeader } from '@/shared/components/PageHeader';
import { SectionLabel } from '@/shared/components/SectionLabel';

// A newer version first (if any), then General (starting with the computer, the version), where
// results are saved and what Glup downloaded.
export const SettingsPage = ({ files }: PageProps) => (
  <div className="flex flex-col gap-6">
    <PageHeader title={SETTINGS_TEXTS.title} subtitle={SETTINGS_TEXTS.subtitle} />
    <UpdateCard />
    <section className="flex flex-col gap-2.5">
      <SectionLabel>{GENERAL_TEXTS.title}</SectionLabel>
      <Card className="flex flex-col gap-3.5 p-3.5">
        <AutostartToggle />
        <div className="border-t border-line" />
        <NotificationsToggle />
        <div className="border-t border-line" />
        <VersionRow />
      </Card>
    </section>
    <section className="flex flex-col gap-2.5">
      <SectionLabel>{SAVE_TEXTS.defaultTitle}</SectionLabel>
      <Card className="p-3.5">
        <SaveLocationPicker location={files.saveLocation} />
      </Card>
    </section>
    <LearnedSection />
  </div>
);
