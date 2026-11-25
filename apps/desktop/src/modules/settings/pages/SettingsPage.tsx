import { LearnedSection } from '@/modules/background/components/LearnedSection';
import { ClipboardSettings } from '@/modules/clipboard/components/ClipboardSettings';
import { DockPositionSetting } from '@/modules/dock/components/DockPositionSetting';
import { IslandLook } from '@/modules/dock/components/IslandLook';
import { ExplorerSettings } from '@/modules/explorer/components/ExplorerSettings';
import { IslandBorderSetting } from '@/modules/island/components/IslandBorderSetting';
import type { PageProps } from '@/modules/main-window/interfaces/pageProps';
import { ScreenTextHistoryToggle } from '@/modules/screen-text/components/ScreenTextHistoryToggle';
import { AutostartToggle } from '@/modules/settings/components/AutostartToggle';
import { NotificationsToggle } from '@/modules/settings/components/NotificationsToggle';
import { SaveLocationPicker } from '@/modules/settings/components/SaveLocationPicker';
import { GENERAL_TEXTS } from '@/modules/settings/constants/general';
import { SAVE_TEXTS, SETTINGS_TEXTS } from '@/modules/settings/constants/saveLocation';
import { ShortcutSetting } from '@/modules/shortcuts/components/ShortcutSetting';
import { GpuSetting } from '@/modules/transcribe/components/GpuSetting';
import { Card } from '@/shared/components/Card';
import { UpdateCard } from '@/modules/updates/components/UpdateCard';
import { VersionRow } from '@/modules/updates/components/VersionRow';
import { PageHeader } from '@/shared/components/PageHeader';
import { SectionLabel } from '@/shared/components/SectionLabel';

// A newer version first (if any), then General (starting with the computer, the notifications, the
// right click and «Enviar a» of the Explorer, the shortcut of "Copiar texto de la pantalla" and whether its texts stay in the history, the version),
// the Portapapeles, where results are saved, "Pasar audio a texto" (graphics card or processor) and
// what Glup downloaded.
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
        <ExplorerSettings />
        <div className="border-t border-line" />
        <DockPositionSetting />
        <IslandLook />
        <div className="border-t border-line" />
        <ShortcutSetting target="screen-text" />
        <ScreenTextHistoryToggle />
        <div className="border-t border-line" />
        <VersionRow />
      </Card>
    </section>
    <IslandBorderSetting />
    <ClipboardSettings />
    <section className="flex flex-col gap-2.5">
      <SectionLabel>{SAVE_TEXTS.defaultTitle}</SectionLabel>
      <Card className="p-3.5">
        <SaveLocationPicker location={files.saveLocation} />
      </Card>
    </section>
    <GpuSetting />
    <LearnedSection />
  </div>
);
