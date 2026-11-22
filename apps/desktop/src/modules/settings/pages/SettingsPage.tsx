import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { SaveLocationPicker } from '@/modules/settings/components/SaveLocationPicker';
import { SAVE_TEXTS, SETTINGS_TEXTS } from '@/modules/settings/constants/saveLocation';
import { Card } from '@/shared/components/Card';
import { PageHeader } from '@/shared/components/PageHeader';
import { SectionLabel } from '@/shared/components/SectionLabel';

// Only the save location for now; the rest of Settings comes later.
export const SettingsPage = ({ files }: PageProps) => (
  <div className="flex flex-col gap-6">
    <PageHeader title={SETTINGS_TEXTS.title} subtitle={SETTINGS_TEXTS.subtitle} />
    <section className="flex flex-col gap-2.5">
      <SectionLabel>{SAVE_TEXTS.defaultTitle}</SectionLabel>
      <Card className="p-3.5">
        <SaveLocationPicker location={files.saveLocation} />
      </Card>
    </section>
  </div>
);

// export const SettingsPage = () => <ComingSoon />;
