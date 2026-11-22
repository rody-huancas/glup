import { LearnedSection } from '@/modules/background/components/LearnedSection';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { AutostartToggle } from '@/modules/settings/components/AutostartToggle';
import { SaveLocationPicker } from '@/modules/settings/components/SaveLocationPicker';
import { GENERAL_TEXTS } from '@/modules/settings/constants/general';
import { SAVE_TEXTS, SETTINGS_TEXTS } from '@/modules/settings/constants/saveLocation';
import { Card } from '@/shared/components/Card';
import { PageHeader } from '@/shared/components/PageHeader';
import { SectionLabel } from '@/shared/components/SectionLabel';

// General (starting with the computer), where results are saved and what Glup downloaded.
export const SettingsPage = ({ files }: PageProps) => (
  <div className="flex flex-col gap-6">
    <PageHeader title={SETTINGS_TEXTS.title} subtitle={SETTINGS_TEXTS.subtitle} />
    <section className="flex flex-col gap-2.5">
      <SectionLabel>{GENERAL_TEXTS.title}</SectionLabel>
      <Card className="p-3.5">
        <AutostartToggle />
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

// export const SettingsPage = () => <ComingSoon />;
